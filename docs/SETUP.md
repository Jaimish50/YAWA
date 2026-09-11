# YAWA setup and implementation notes

## Run locally

MongoDB must be running. If needed, open PowerShell as Administrator and run:

~~~powershell
Start-Service MongoDB
~~~

Run `npm.cmd ci` and `npm.cmd start` in `server`, then the same commands in `public`
in another terminal. Open `http://localhost:3000`. Use `localhost` consistently;
switching to `127.0.0.1` changes cookie origins. Stop an older backend before starting
the updated one.

The existing database URL in `server/.env` is preserved. On a fresh checkout,
copy `server/.env.example` to `server/.env`. The frontend defaults to port 5000;
`public/.env.example` shows the API URL override. Keep secrets out of Git.

## Enable real OTP emails with Brevo

Brevo's free plan currently includes 300 emails/day, shared across sends and resends.
[Free-plan limits](https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan).
Exceeding that allowance can delay or prevent delivery.

1. Create a free Brevo account and complete its onboarding and transactional-email activation.
2. Add and verify a sender address. If you own a domain, complete Brevo's domain authentication
   (DKIM/DMARC) to support reliable delivery.
3. Open **Settings → SMTP & API**, copy the **SMTP login**, and generate an **SMTP key**.
   These are different from your account password and API key.
4. Fill the blank settings in `server/.env` locally:

~~~dotenv
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-login-from-brevo
SMTP_PASS=your-smtp-key
MAIL_FROM="YAWA <your-verified-sender@example.com>"
~~~

Port 587 upgrades to encrypted STARTTLS; the app requires TLS. `MAIL_FROM` must be a
verified sender, not the technical SMTP login. Restart the backend after changing these values.
Register using an email you can access, check inbox/spam, and enter the six-digit code.

Official references:
[SMTP setup](https://help.brevo.com/hc/en-us/articles/7924908994450-Send-transactional-emails-using-Brevo-SMTP),
[credential and sender troubleshooting](https://help.brevo.com/hc/en-us/articles/115000188150-Troubleshooting-Issues-with-Brevo-SMTP).

No SMTP credentials are included. Without configuration, registration returns a clear error;
it does not pretend to send email or bypass verification. Automated tests use a local SMTP sink;
delivery to a real inbox must be checked after adding your credentials.

## Registration and login

- Sending a code creates only a temporary email challenge with a bcrypt-hashed OTP.
  The password remains in the registration screen's memory until verification.
- Codes expire after 10 minutes, permit 5 guesses, and have a 60-second resend cooldown.
  Resending replaces the earlier challenge. MongoDB TTL indexes clean up expired records;
  the API checks expiration immediately, without waiting for cleanup.
- A Users document is created only after consuming a valid, unused code. Its password is
  bcrypt-hashed with work factor 12 and its `emailVerifiedAt` records verification.
- New passwords require 12+ characters with a letter, number and symbol, and at most 72
  UTF-8 bytes (bcrypt's input limit).
- Login uses generic credential errors and database-backed IP/username limits, which survive
  restart. Existing accounts retain access with their existing passwords; they are not
  falsely marked email-verified.
- A random 256-bit session token lives in an HttpOnly cookie. Only its SHA-256 hash is stored
  in MongoDB. Sessions expire after 12 hours, rotate on login and are revoked on logout.
  Passwords and authentication tokens are never returned in profiles or stored in localStorage.
- HTTP routes authorize the logged-in user. Sockets join rooms through that same validated
  session. Clients cannot choose a sender ID or update someone else's avatar.
- JSON writes require `X-Requested-With: XMLHttpRequest` and a permitted browser origin,
  protecting cookie-authenticated writes against CSRF. Logout also disconnects its sockets.

## Chat ordering and unread dots

An incoming message moves its sender to the top with a green dot and tinted background.
Unread status is independent for each sender and recipient, survives refresh and reconnect,
and clears when the conversation is displayed in a visible tab. Background tabs don't mark
messages read. Other people's conversations do not change your chat order.

The server saves messages before broadcasting them. Message IDs deduplicate socket events
and HTTP/history responses. Read requests include the last displayed message ID, so a racing
new message remains unread. Selection follows contact IDs rather than list positions.
Historical messages without an `unread` field are treated as already read.

The old unauthenticated `add-user` and `send-msg` socket events and global `changeOrder` route
are removed. The new client and backend must be deployed together.

## Test

With a local MongoDB server running:

~~~powershell
cd server
npm.cmd test
cd ..\public
npm.cmd test -- --watchAll=false --runInBand
npm.cmd run build
~~~

Backend tests use a random `yawa_feature_test_*` database and delete only that database
afterwards. They never use `MONGO_URL` or the app's database name. `TEST_MONGO_URL` can select
a test-only MongoDB server. Test emails go to a local SMTP sink, not real recipients.

Manual check: use two browser profiles (or normal/incognito windows), register accounts,
choose avatars, and exchange messages. Leave another chat open, receive a message, refresh,
then open its sender's chat: the dot should persist until the conversation is read.

## Deployment

Use HTTPS and `NODE_ENV=production` for Secure session cookies. Set `CLIENT_ORIGIN` to the
exact frontend origin and `REACT_APP_API_URL` to the backend URL. Set `TRUST_PROXY=1` only
behind exactly one trusted reverse proxy. Separate frontend/backend sites require
`COOKIE_SAME_SITE=none` over HTTPS; browser third-party-cookie restrictions still apply,
so a same-site deployment is preferable.

This Socket.IO room setup targets one backend instance. Multiple instances require a shared
Socket.IO adapter and cross-instance socket revocation. Database sessions/rate limits are
already shared, but cross-instance socket delivery is not configured here.

## Interview explanation

“I added a two-step email-verification flow so unverified registrations never became accounts.
I hashed temporary codes, enforced expiry and attempt limits, and consumed codes atomically
to prevent reuse. I replaced browser-supplied identities with expiring server-validated sessions
and authorized both HTTP requests and sockets. For chat notifications, I tracked unread messages
per recipient, ordered conversations by persisted activity, and cleared only messages actually
displayed. I tested expiry, brute-force limits, replay, impersonation, concurrent requests and
real-time delivery using an isolated database and local SMTP server.”
