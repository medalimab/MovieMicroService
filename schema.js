const { gql } = require('@apollo/server');

const typeDefs = `#graphql
  type Movie {
    id: String!
    title: String!
    description: String!
  }
  type TVShow {
    id: String!
    title: String!
    description: String!
  }
  type Query {
    movie(id: String!): Movie
    movies(query: String): [Movie]
    tvShow(id: String!): TVShow
    tvShows(query: String): [TVShow]
  }
  type Mutation {
    createMovie(id: String!, title: String!, description: String!): Movie
    createTVShow(id: String!, title: String!, description: String!): TVShow
  }
`;

module.exports = typeDefs;