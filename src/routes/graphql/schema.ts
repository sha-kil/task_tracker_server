import { buildSchema } from "graphql"

export const schema = buildSchema(`
  type Status {
    color: String
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

  type UserHistory {
    currentValue: String
    id: ID!
    issue: UserHistoryIssue!
    topic: String!
    updatedAt: String!
  }

  type Query {
    issueTable(ids: [ID!]): [IssueTable!]!
    commentsWithUser(issueId: ID!): [CommentWithUser!]!
    userWithAddress(userId: ID!): UserWithAddress!
    userIssueList(userId: ID!): [IssueTable!]!
    userHistories(userId: ID!): [UserHistory!]!

    test(a: String!): TestResponse
  }
`)
