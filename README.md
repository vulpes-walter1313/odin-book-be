## Routes

- [x] `POST /auth/signin`
- [x] `POST /auth/signup`
- [x] `POST /auth/refresh` (refresh access token)
- [x] `GET /auth/check` (checks if auth is valid)
- [x] `GET /posts`
- [x] `POST /posts`
- [x] `GET /posts/:postId`
- [x] `PUT /posts/:postId`
- [x] `DELETE /posts/:postId`
- [x] `POST /posts:postId/likes`
- [x] `DELETE /posts:postId/likes`
- [x] `GET /posts/:postId/comments`
- [x] `POST /posts/:postId/comments`
- [x] `PUT /posts/:postId/comments/:commentId`
- [x] `DELETE /posts/:postId/comments/:commentId`
- [x] `POST /posts/:postId/comments/:commentId/like`
- [x] `DELETE /posts/:postId/comments/:commentId/like`
- [x] `GET /profiles`
- [x] `GET /profiles/:username`
- [x] `POST /profiles/:username/follow` (follow user)
- [x] `DELETE /profiles/:username/follow` (unfollow user)
- [x] `GET /profiles/:username/followers`
- [x] `GET /profiles/:username/following`
- [x] `GET /account/user`
- [x] `PUT /account/user`
- [x] `PUT /account/username`
- [x] `PUT /account/password`
- [x] `DELETE /account/user`
- [x] `DELETE /admin/users/:username`
- [x] `POST /admin/users/ban`
- [x] `DELETE /users/ban`

### `POST /signin`

Route will login the user with passportjs. Look for Passport requirements to make this happen

### `POST /signup`

Route will sign up user with passportjs. Look for Passport requirements to make this happen

### `DELETE /logout`

Route will destroy session or jwt, still undecided.

### `GET /posts`

Query Params:

- feed:
  - personal
  - explore
  - user
- sort:
  - popular
  - latest
  - oldest
- username (unique username)
- page

This route will be the infinite scroll endpoint to fetch many post in the specific feed asked for. The feed can be "personal" which only shows posts from people you follow, "explore" which shows all users posts, and "user", which only fetches post from a specific user which requires an additional query param of "username" that has the id of that specific user.

#### Example Request

```text
http://localhost:3000/posts?feed=personal&sort=popular&page=1
```

### `GET /posts/:postId`

Gets the data from this post including number of comments and number of likes of the post. the actual comments can be grabbed by a different endpoint `/posts/:postId/comments`

### `PUT /posts/:postId`

This route will update the post and can only be used by admin and the post author

### `DELETE /posts/:postId`

This endpoint can only delete the post in question if user is admin or post author.

### `GET /posts/:postId/comments`

This endpoint will fetch comments from the post in question. I am considering to eventually be able to sort comments by popular, but for now, we can just sort by createdAt descending. so from latest to oldest.

### `POST /posts/:postId/comments`

This endpoint will allow users to post a comment on a specific post.

#### Example Request body

```json
{
  "message": "that is a really cool post"
}
```

### `PUT /posts/:postId/comments/:commentId`

this endpoint allows the admin or the comment author to edit their comment message.

### `DELETE /posts/:postId/comments/:commentId`

this endpoint allows the comment author or the admin to delete the comment

### `POST /posts/:postId/like`

This endpoint is the record the current logged in user liking the post in question

### `DELETE /posts/:postId/like`

This endpoint unlikes a post.

### `GET /profiles`

This will be like a directory to find new users to follow. should be paginated and have a search feature. default sort should be by followers count then sorted by name.

### `GET /profiles/:username`

This endpoint fetched the profile data of the user in question. Think of name, username, bio. This is not to update your account settings, this is to view a user's profile. To fetch the user's post, you would use the `/posts?feed=user&username=<username>`. The usernames are unique so this should be just as good as the user's cuid.

### `POST /profiles/:username/follow`

This endpoint allows logged in user to follow the user in question.

### `DELETE /profiles/:username/follow`

This endpoint allows logged in user to unfollow the user in question.

### `GET /profiles/:username/followers`

This gets a list of users that :username is followed by. Should be paginated.

### `GET /profiles/:username/following`

This endpoint gets a list of users that :username is following. Should be paginated.

### `GET /account/user`

This endpoint fetches the logged in user's account data. most of this is created during signup, and can be edited later in the next endpoint.

### `PUT /account/user`

This endpoint updates the user's account data.

### `PUT /account/password`

this endpoint updates the users password by asking for the old password, a new password, and confirming the new password.

### `DELETE /account/user`

This permanently deletes the account. posts and comments will also get deleted.

### `DELETE /admin/users/:username`

This is an admin route that allows admin to delete users

### `POST /admin/users/:username/ban`

This is an admin route, that allows admin to ban users for a specified time.

### `DELETE /admin/users/:username/ban`

This is an admin route, that allows admin to remove a ban.

## Server Error Response

The client should be able to get error responses from the server and interpret them to make FE decisions.

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "some message",
    "details": {
      "property": "value"
    }
  }
}
```

Validation errors can look a bit different, like so

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "you have one or more validation errors"
  },
  "validationErrors": {
    "email": {
      "type": "field",
      "value": "curios123",
      "msg": "Invalid value",
      "path": "email",
      "location": "body"
    },
    "password": {
      "type": "field",
      "value": "",
      "msg": "Invalid value",
      "path": "password",
      "location": "body"
    }
  }
}
```
