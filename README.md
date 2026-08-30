[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][npm-url]
[![Bun Version][bun-version-image]][bun-version-url]
[![HDF5 Target Version][hdf5-version-image]][hdf5-version-url]
[![Build Status][github-actions-image]][github-actions-url]

# hdf5.bun

To install dependencies:

```bash
bun install
```

To run:

Edit the .env to set native hdf5 library directory ```HDF5_ROOT``` and data directory ```HDF5_DATA_DIR``` with h5 files of interest.

Unless you have a trusted certificate, create a cerificate with  ```mkcert localhost 127.0.0.1 ::1```
Set the KEY & CERT
```
export TLS_KEY_FILE=<your favorite place>/localhost+2-key.pem
export TLS_CERT_FILE=<your favorite place>/localhost+2.pem
```
to enable https security.


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

Go to ```https://localhost:5173/``` defaut port.

Swagger UI at ```https://localhost:3000/docs```

AsyncAPI UI at ```https://localhost:3000/asyncapi```

This project was created using `bun init` in bun v1.3.14. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.


### Test it

```bash
bun test ./test/test_hdf5.js
bun test ./test/test_h5im.js
bun test ./test/test_h5lt.js #23 passing 18 failing
```


[npm-image]: https://shields.io
[npm-url]: https://npmjs.com

[downloads-image]: https://shields.io

[bun-version-image]: https://shields.io
[bun-version-url]: https://bun.sh

[hdf5-version-image]: https://shields.io
[hdf5-version-url]: https://hdfgroup.org

[github-actions-image]: https://github.com
[github-actions-url]: https://github.com
