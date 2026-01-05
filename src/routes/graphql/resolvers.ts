import { issueTable } from "src/routes/graphql/issueTable.js"
import { commentsWithUser } from "src/routes/graphql/commentsWithUser.js"
import { userWithAddress } from "src/routes/graphql/userWithAddress.js"
import { userIssueList } from "src/routes/graphql/userIssueList.js"
import { userHistories } from "src/routes/graphql/userHistories.js"
import { updateUserWithAddress } from "src/routes/graphql/updateUserWithAddress.js"

export const resolvers = {
  issueTable: issueTable,
  commentsWithUser: commentsWithUser,
  userWithAddress: userWithAddress,
  updateUserWithAddress: updateUserWithAddress,
  userIssueList: userIssueList,
  userHistories: userHistories,
  test: ({ a }: { a: string }) => {
    const data = {
      message: "Test successful",
    }

    console.log("Received input:", a)
    console.log("Returning data:", data)
    return data
  },
}
