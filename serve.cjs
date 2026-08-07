const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 8118;

app.use(express.static(path.join(__dirname), {
  setHeaders(res, filePath) {
    if (filePath.endsWith('.js')) res.setHeader('Content-Type', 'application/javascript');
  }
}));

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
