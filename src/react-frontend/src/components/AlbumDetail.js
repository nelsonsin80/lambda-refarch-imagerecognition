import React, { useState, useEffect } from "react";
import { API, graphqlOperation, Auth } from "aws-amplify";

import { Header, Form, Segment } from "semantic-ui-react";

import * as queries from "../graphql/queries";
import * as subscriptions from "../graphql/subscriptions";
import { PhotoList, S3ImageUpload } from "./PhotoList";

export const AlbumDetails = (props) => {
  const [album, setAlbum] = useState({ name: "Loading...", photos: [] });
  const [photos, setPhotos] = useState([]);
  const [hasMorePhotos, setHasMorePhotos] = useState(true);
  const [fetchingPhotos, setFetchingPhotos] = useState(false);
  const [nextPhotosToken, setNextPhotosToken] = useState(null);
  const [processingStatuses, setProcessingStatuses] = useState({});

  useEffect(() => {
    const loadAlbumInfo = async () => {
      const results = await API.graphql(
        graphqlOperation(queries.getAlbum, { id: props.id })
      );
      setAlbum(results.data.getAlbum);
    };

    loadAlbumInfo();
  }, [props.id]);

  const fetchNextPhotos = async () => {
    const FETCH_LIMIT = 20;
    setFetchingPhotos(true);

    const queryArgs = {
      albumId: props.id,
      limit: FETCH_LIMIT,
      ...(nextPhotosToken ? { nextToken: nextPhotosToken } : {}),
    };

    const results = await API.graphql(
      graphqlOperation(queries.listPhotosByAlbumUploadTime, queryArgs)
    );

    const items = results.data.listPhotosByAlbumUploadTime.items;
    const nextToken = results.data.listPhotosByAlbumUploadTime.nextToken;

    setPhotos((p) => p.concat(items));
    setNextPhotosToken(nextToken);
    setHasMorePhotos(items.length === FETCH_LIMIT);
    setFetchingPhotos(false);
  };

  useEffect(() => {
    // initial photos load
    fetchNextPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let subscription;

    async function setupSubscription() {
      const user = await Auth.currentAuthenticatedUser();
      subscription = API.graphql(
        graphqlOperation(subscriptions.onCreatePhoto, {
          owner: user.username,
        })
      ).subscribe({
        next: (data) => {
          const photo = data.value.data.onCreatePhoto;
          if (photo.albumId !== props.id) return;

          setPhotos((p) => p.concat([photo]));

          setProcessingStatuses((prevState) => ({
            ...prevState,
            [photo.id]: {
              status: photo.ProcessingStatus,
              sfnArn: photo.SfnExecutionArn,
            },
          }));
        },
      });
    }

    setupSubscription();

    return () => {
      if (subscription && typeof subscription.unsubscribe === "function") {
        subscription.unsubscribe();
      }
    };
  }, [props.id]);

  useEffect(() => {
    let subscription;

    async function setupSubscription() {
      const user = await Auth.currentAuthenticatedUser();
      subscription = API.graphql(
        graphqlOperation(subscriptions.onUpdatePhoto, {
          owner: user.username,
        })
      ).subscribe({
        next: (data) => {
          const photo = data.value.data.onUpdatePhoto;
          if (photo.albumId !== props.id) return;

          setPhotos((p) => {
            const newPhotos = p.map((item) =>
              item.id === photo.id ? photo : item
            );

            setProcessingStatuses((prevState) => ({
              ...prevState,
              [photo.id]: {
                status: photo.ProcessingStatus,
                sfnArn: photo.SfnExecutionArn,
              },
            }));

            return newPhotos;
          });
        },
      });
    }

    setupSubscription();

    return () => {
      if (subscription && typeof subscription.unsubscribe === "function") {
        subscription.unsubscribe();
      }
    };
  }, [props.id]);

  return (
    <Segment>
      <Header as="h3">{album.name}</Header>
      <S3ImageUpload
        albumId={album.id}
        clearStatus={() => setProcessingStatuses({})}
        processingStatuses={processingStatuses}
      />
      <PhotoList photos={photos} />
      {hasMorePhotos && (
        <Form.Button
          onClick={fetchNextPhotos}
          icon="refresh"
          disabled={fetchingPhotos}
          content={fetchingPhotos ? "Loading..." : "Load more photos"}
        />
      )}
    </Segment>
  );
};
