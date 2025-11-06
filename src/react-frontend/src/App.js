// Copyright 2017 Amazon Web Services, Inc. or its affiliates.
// Licensed under the Apache License, Version 2.0 (the "License").

import React from 'react';
import { Amplify } from 'aws-amplify';
import { Authenticator } from '@aws-amplify/ui-react';
import awsExports from './aws-exports';

import { Grid, Header, Menu } from 'semantic-ui-react';
import { BrowserRouter as Router, NavLink, Route } from 'react-router-dom';

import { AlbumList, NewAlbum } from './components/Album';
import { AlbumDetails } from './components/AlbumDetail';

import '@aws-amplify/ui-react/styles.css';

Amplify.configure(awsExports);

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
              <Route path="/" exact component={NewAlbum} />
              <Route
                path="/"
                exact
                component={() =>
                  !user ? null : <AlbumList />
                }
              />
              <Route
                path="/albums/:albumId"
                render={(props) => (
                  <AlbumDetails id={props.match.params.albumId} />
                )}
              />
            </Grid.Column>
          </Grid>
        </Router>
      )}
    </Authenticator>
  );
}

export default App;
