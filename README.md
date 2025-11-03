Setup

1. Create a `.env` file:

```
PORT=4000
MONGO_URL=mongodb://127.0.0.1:27017/ercs_demo
JWT_SECRET=change-me
```

2. Install deps and run:

```
npm install
npm run dev
```

API

- `POST /api/auth/register` name, email, password, role(optional)
- `POST /api/auth/login` email, password
- `GET /api/me` Bearer token
- `GET /api/events` | `POST /api/events`
- `GET /api/projects` | `POST /api/projects`
- `POST /api/register` { type: 'event'|'project', refId }
- `GET /api/my/registrations`












