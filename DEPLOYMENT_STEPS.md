# SchoolAdmin deployment steps

This project can run in two ways:

1. **Render full-stack deployment**: Render runs the Express API and serves the built React app from `client/dist`.
2. **Render + Vercel split deployment**: Render runs only the API, and Vercel hosts the React frontend.

## Required environment variables

### Backend / Render

```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.krhhqvp.mongodb.net/EducationManagement?retryWrites=true&w=majority&appName=Cluster0
MONGODB_DB=EducationManagement
JWT_SECRET=replace-with-a-long-random-secret
ENABLE_DEMO_ACCOUNTS=true
ENABLE_DEMO_DATA=true
CORS_ORIGIN=https://your-vercel-site.vercel.app
```

Use the MongoDB Atlas username/password from your cluster in Render environment variables only. Do not commit the real URI to GitHub. For first deploy, you can set `CORS_ORIGIN=*`. After Vercel is deployed, change it to the real Vercel domain.

### Frontend / Vercel

```env
VITE_API_URL=https://your-render-service.onrender.com
```

Do not add `/api` at the end. The frontend code already calls `/api/...` routes.

## Local run

```bash
npm install
npm run build
npm start
```

Open: `http://localhost:5001`

For development mode:

```bash
npm run dev
```

## Render settings

- Runtime: Node
- Build Command: `npm ci && npm run build`
- Start Command: `npm start`
- Health Check Path: `/api/health`
- Root Directory: leave empty

## Vercel settings

- Framework Preset: Vite
- Build Command: `npm run build`
- Output Directory: `client/dist`
- Install Command: `npm install`
- Root Directory: leave empty

## GitHub checklist

- Keep `.env` private. The committed `.env.example` shows the required keys.
- Push `package.json`, `package-lock.json`, `client/src`, `server`, `render.yaml`, `vercel.json`, and docs.
- Do not push `node_modules` or `client/dist`; both are ignored.

## Step-by-step deployment

### 1. Prepare MongoDB Atlas

1. Open MongoDB Atlas and create or use your existing cluster.
2. Create a database user with a strong password.
3. Add your deployment IP access rule. For Render/Vercel testing, allow access from anywhere with `0.0.0.0/0`, then tighten it later if needed.
4. Copy the connection string and set the database name to `EducationManagement`.

### 2. Push to GitHub

1. Create a new GitHub repository.
2. In this project, confirm `.env`, `node_modules`, and `client/dist` are not committed.
3. Run:

```bash
git add .
git commit -m "Prepare school management app for deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### 3. Deploy backend on Render

1. Go to Render and choose **New Web Service**.
2. Connect the GitHub repository.
3. Use these settings:
   - Runtime: `Node`
   - Build Command: `npm ci && npm run build`
   - Start Command: `npm start`
   - Health Check Path: `/api/health`
4. Add environment variables:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.krhhqvp.mongodb.net/EducationManagement?retryWrites=true&w=majority&appName=Cluster0
MONGODB_DB=EducationManagement
JWT_SECRET=use-a-long-random-secret
ENABLE_DEMO_ACCOUNTS=true
ENABLE_DEMO_DATA=true
CORS_ORIGIN=*
```

5. Deploy and wait until Render shows the service is live.
6. Test the health URL:

```text
https://your-render-service.onrender.com/api/health
```

### 4. Deploy frontend on Vercel

1. Go to Vercel and choose **Add New Project**.
2. Import the same GitHub repository.
3. Use these settings:
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `client/dist`
   - Install Command: `npm install`
4. Add this environment variable:

```env
VITE_API_URL=https://your-render-service.onrender.com
```

5. Deploy the project.
6. After Vercel gives you a domain, return to Render and replace `CORS_ORIGIN=*` with your Vercel URL:

```env
CORS_ORIGIN=https://your-vercel-site.vercel.app
```

7. Redeploy Render after changing `CORS_ORIGIN`.

### 5. Final live test

1. Open your Vercel URL.
2. Log in with:

```text
admin@school.test
test1234
```

3. Check Dashboard, Students, Fees, Marks, Results, Class Teachers, and Settings.
4. Test one payment receipt and one result card print/PDF.
