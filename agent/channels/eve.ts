import { eveChannel } from 'eve/channels/eve'
import { localDev, none, vercelOidc } from 'eve/channels/auth'

// Public access by default — each user deploys their own copy and is
// responsible for who reaches the URL. To lock it down, swap `none()` for
// a real auth strategy (HTTP Basic, JWT, OIDC, your Auth.js / Clerk session).
export default eveChannel({
  auth: [localDev(), vercelOidc(), none()],
})
