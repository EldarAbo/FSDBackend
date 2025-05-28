import initApp from "./server.js";
import https from "https";
import fs from "fs";

const port = process.env.PORT;

initApp().then((app) => {
  if (process.env.NODE_ENV !== "production") {
    app.listen(port, () => {
      console.log(`Example app listening at http://localhost:${port}`);
    });
  } else {
    const props = { 
      key: fs.readFileSync("/app/certs/client-key.pem"), 
      cert: fs.readFileSync("/app/certs/client-cert.pem") 
    };
    https.createServer(props, app).listen(port, () => {
      console.log(`Example app listening at https://localhost:${port}`);
    });
  }
});