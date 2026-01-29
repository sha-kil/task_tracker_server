import { buildSchema } from "graphql"

export const schema = buildSchema(`
  type Status {
    id: ID! 
    name: String
  }

  type IssueTable {
    assignee: ID 
    childrenIds: [ID!]!
    createdAt: String!
    createdById: ID!
    id: ID!
    labels: [String!]!
    priority: String
    status: Status
    title: String
  }

  type Comment {
    id: ID!
    text: String!
    createdAt: String!
    updatedAt: String!
    edited: Boolean!
    likedByUserIds: [ID!]!
    parentId: ID
    authorId: ID! 
  }

  type CommentUser {
    id: ID!
    firstName: String!
    lastName: String!
    email: String!
    lastActive: String!
    profilePictureUrl: String 
  }

  type CommentWithUser {
    comment: Comment!
    user: CommentUser! 
  }

  type TestResponse {
    message: String
  }

  type AddressUser {
    id: ID!
    firstName: String!
    lastName: String!
    email: String!
    lastActive: String!
    profilePictureUrl: String
    position: String
    department: String
    organization: String
    teamId: ID
  }

  type Address {
    id: ID!
    apartmentNumber: String
    houseNumber: String!
    street: String!
    city: String!
    state: String!
    zipCode: String!
    country: String! 
  }

  type UserWithAddress {
    user: AddressUser!
    address: Address
  }

  type UserHistoryIssue {
    id: ID!
    title: String!
  }

  type HistoryChange {
    topic: String!
    current: String
    previous: String
  }

  type UserHistory {
    authorId: ID!
    change: HistoryChange!
    changedAt: String!
    id: ID!
    issue: UserHistoryIssue!
  }

  input UserWithAddressInput {
    id: ID!
    firstName: String
    lastName: String
    profilePictureUrl: String
    position: String
    department: String
    organization: String
    teamId: String
    apartmentNumber: String
    houseNumber: String
    street: String
    city: String
    state: String
    zipCode: String
    country: String
  }

  type Query {
    issueTable(ids: [ID!], projectId: String): [IssueTable!]!
    commentsWithUser(issueId: ID!): [CommentWithUser!]!
    userWithAddress(userId: ID!): UserWithAddress!
    userIssueList(userId: ID!): [IssueTable!]!
    userHistories(userId: ID!): [UserHistory!]!
    
    test(a: String!): TestResponse
  }
    
  type Mutation {
    updateUserWithAddress(inputData: UserWithAddressInput!): UserWithAddress!
  }
`)
