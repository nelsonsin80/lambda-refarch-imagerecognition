import React, { useState, useEffect } from "react";

import {
  Card,
  Label,
  Divider,
  Form,
  Dimmer,
  Loader,
  Message,
} from "semantic-ui-react";

import { v4 as uuid } from "uuid";
import * as mutations from "../graphql/mutations";
import AWSConfig from "../aws-exports";
import { API, graphqlOperation, Auth, Storage } from "aws-amplify";

//
// Small helper to load a private S3 object and show it as an <img>.
//
const S3Thumbnail = ({ imgKey }) => {
  const [src, setSrc] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Storage.get(imgKey, { level: "private" })
      .then((url) => {
        if (!cancelled) {
          setSrc(url);
        }
      })
      .catch((err) => {
        console.error("Error loading image from S3", err);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [imgKey]);

  if (loading) {
    return (
      <Dimmer active inverted>
        <Loader>Loading</Loader>
      </Dimmer>
    );
  }

  if (!src) {
    return <div>Image unavailable</div>;
  }

  return (
    <img
      src={src}
      alt=""
      style={{ maxWidth: "100%", height: "auto", display: "block" }}
    />
  );
};

export const S3ImageUpload = (props) => {
  const [uploading, setUploading] = useState(false);
  const [statuses, setStatuses] = useState({});

  const ProcessingStatus = (props) => {
    const sfnExecutionLink = (sfnArn) => {
      if (!sfnArn) {
        return null;
      }
      const arnComponents = sfnArn.split(":");
      const awsRegion = arnComponents[3];
      const executionId = arnComponents[arnComponents.length - 1];
      const consoleUrl = `https://console.aws.amazon.com/states/home?region=${awsRegion}#/executions/details/${sfnArn}`;
      return (
        <span>
          Step Function execution:{" "}
          <a href={consoleUrl} target="_blank" rel="noopener noreferrer">
            {executionId}
          </a>
        </span>
      );
    };

    return Object.keys(statuses).map((fileId) => {
      const status = statuses[fileId];
      const incoming = props.processingStatuses[fileId];

      const mergedStatus = {
        ...status,
        ...(incoming || {}),
      };

      return (
        <Message positive key={fileId}>
          <p>
            <b>{mergedStatus.filename}</b>
            {mergedStatus.status === "PENDING" && " uploading to S3."}
            {(mergedStatus.status === "UPLOADED" ||
              mergedStatus.status === "RUNNING") &&
              " uploaded. Processing... "}
            {mergedStatus.status === "SUCCEEDED" &&
              " successfully processed. "}
            {sfnExecutionLink(mergedStatus.sfnArn)}
          </p>
        </Message>
      );
    });
  };

  const uploadFile = async (file) => {
    const imageId = uuid();
    const fileName = "uploads/" + imageId + "." + file.name.split(".").pop();
    const user = await Auth.currentAuthenticatedUser();

    const createPhotoArg = {
      id: imageId,
      albumId: props.albumId,
      owner: user.username,
      uploadTime: new Date().toISOString(),
      bucket: AWSConfig.aws_user_files_s3_bucket,
      ProcessingStatus: "PENDING",
    };

    await API.graphql(
      graphqlOperation(mutations.createPhoto, { input: createPhotoArg })
    );

    setStatuses((prevStatus) => ({
      ...prevStatus,
      [imageId]: {
        filename: file.name,
        status: "PENDING",
      },
    }));

    try {
      const result = await Storage.vault.put(fileName, file, {
        metadata: {
          albumid: props.albumId,
          owner: user.username,
        },
      });

      setStatuses((prevStatus) => ({
        ...prevStatus,
        [imageId]: {
          ...prevStatus[imageId],
          status: "UPLOADED",
        },
      }));

      console.log(`Uploaded ${file.name} to ${fileName}: `, result);
    } catch (e) {
      console.log("Failed to upload to s3.", e);
    }
  };

  const onFileSelectionChange = async (e) => {
    setUploading(true);

    const files = [];
    for (let i = 0; i < e.target.files.length; i += 1) {
      files.push(e.target.files.item(i));
    }

    setStatuses({});
    props.clearStatus();

    await Promise.all(files.map((f) => uploadFile(f)));

    setUploading(false);
  };

  return (
    <div>
      <Form.Button
        onClick={() =>
          document.getElementById("add-image-file-input").click()
        }
        disabled={uploading}
        icon="file image outline"
        content={uploading ? "Uploading..." : "Add Images"}
      />
      <input
        id="add-image-file-input"
        type="file"
        accept="image/*"
        multiple
        onChange={onFileSelectionChange}
        style={{ display: "none" }}
      />
      <ProcessingStatus processingStatuses={props.processingStatuses} />
    </div>
  );
};

export const PhotoList = React.memo((props) => {
  const PhotoItems = (props) => {
    const photoItem = (photo) => {
      if (photo.ProcessingStatus === "SUCCEEDED") {
        const DetectedLabels = () => {
          if (photo.objectDetected) {
            return photo.objectDetected.map((tag) => (
              <Label basic color="orange" key={tag}>
                {tag}
              </Label>
            ));
          }
          return null;
        };

        const GeoLocation = () => {
          if (photo.geoLocation) {
            const geo = photo.geoLocation;
            return (
              <p>
                <strong>Geolocation:</strong>&nbsp;
                {geo.Latitude.D}°
                {Math.round(geo.Latitude.M)}'
                {Math.round(geo.Latitude.S)}"
                {geo.Latitude.Direction}
                &nbsp;
                {geo.Longtitude.D}°
                {Math.round(geo.Longtitude.M)}'
                {Math.round(geo.Longtitude.S)}"
                {geo.Longtitude.Direction}
              </p>
            );
          }
          return null;
        };

        const thumbKey =
          "resized/" + photo.thumbnail.key.replace(/.+resized\//, "");

        return (
          <Card key={photo.id}>
            <Card.Content textAlign="center">
              <S3Thumbnail imgKey={thumbKey} />
            </Card.Content>
            <Card.Content>
              <Card.Meta>
                <span className="date">
                  Uploaded:{" "}
                  {new Date(photo.uploadTime).toLocaleString(undefined, {
                    hour12: false,
                  })}
                </span>
              </Card.Meta>
              <Card.Description>
                <p>
                  <b>Detected labels:</b>
                </p>
                <DetectedLabels />
                <p>
                  <b>Image size: </b>
                  {photo.fullsize.width} x {photo.fullsize.height}
                </p>
                <GeoLocation />
                {(photo.exifMake || photo.exitModel) && (
                  <p>
                    <strong>Device: </strong>
                    {photo.exifMake} {photo.exitModel}
                  </p>
                )}
              </Card.Description>
            </Card.Content>
          </Card>
        );
      }

      if (
        photo.ProcessingStatus === "RUNNING" ||
        photo.ProcessingStatus === "PENDING"
      ) {
        return (
          <Card key={photo.id}>
            <Dimmer active>
              <Loader> Processing </Loader>
            </Dimmer>
          </Card>
        );
      }

      return null;
    };

    return <Card.Group>{props.photos.map(photoItem)}</Card.Group>;
  };

  return (
    <div>
      <Divider hidden />
      <PhotoItems photos={props.photos} />
    </div>
  );
});
