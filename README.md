# hdf5.bun

To install dependencies:

```bash
bun install
```

To run:

```bash
PORT=3000
if lsof -Pi:$PORT -sTCP:LISTEN -t >/dev/null ; then
   echo "backend is already running on port $PORT. Skipping start."
else
   echo "Port $PORT is free. Starting backend application..."
bun dev:backend
fi
PORT=5173
if lsof -Pi:$PORT -sTCP:LISTEN -t >/dev/null ; then
   echo "frontend is already running on port $PORT. Skipping start."
else
   echo "Port $PORT is free. Starting frontend application..."
bun install
bun dev:frontend
fi

```
Then have two tabbed terminals open. Run your script where the first pass brings up backend watch and the next tab the frontend.

Swagger endpoint at ```http://localhost:3000/docs```

This project was created using `bun init` in bun v1.3.14. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
