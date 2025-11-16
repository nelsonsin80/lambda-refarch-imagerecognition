// Copyright 2017 Amazon Web Services, Inc. or its affiliates.
// Licensed under the Apache License, Version 2.0 (the "License").

import React from "react";
import { Authenticator } from "@aws-amplify/ui-react";

import { Grid, Header, Menu } from "semantic-ui-react";
import {
  BrowserRouter as Router,
  NavLink,
  Routes,
  Route,
  useParams,
} from "react-router-dom";

import { AlbumList, NewAlbum } from "./components/Album";
import { AlbumDetails } from "./components/AlbumDetail";

import "@aws-amplify/ui-react/styles.css";

// Small wrapper to bridge react-router-dom v6 params into AlbumDetails props
function AlbumDetailsRoute() {
  const { albumId } = useParams();
  return <AlbumDetails id={albumId} />;
}

function App() {
  return (
    <Authenticator>
      {({ signOut, user }) => (
        <Router>
          <Menu inverted attached>
            <Menu.Item name="home">
              <NavLink to="/">
                <Header color="yellow">Albums</Header>
              </NavLink>
            </Menu.Item>
            <Menu.Menu position="right">
              <Menu.Item>
                <button onClick={signOut} className="ui button">
                  Sign Out
                </button>
              </Menu.Item>
            </Menu.Menu>
          </Menu>

          <Grid padded>
            <Grid.Column>
              <Routes>
                {/* Root route: show NewAlbum always, AlbumList only when user exists */}
                <Route
                  path="/"
                  element={
                    <>
                      <NewAlbum />
                      {user && <AlbumList />}
                    </>
                  }
                />

                {/* Album details route, using URL param */}
                <Route path="/albums/:albumId" element={<AlbumDetailsRoute />} />
              </Routes>
            </Grid.Column>
          </Grid>
        </Router>
      )}
    </Authenticator>
  );
}

export default App;
