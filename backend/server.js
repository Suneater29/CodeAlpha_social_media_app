require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('./db');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const postRoutes = require('./routes/postRoutes');
const commentRoutes = require('./routes/commentRoutes');
const uploadRoutes=require('./routes/uploadRoutes');
const { isModuleNamespaceObject } = require('util/types');
const { resourceUsage } = require('process');

const app = express();

app.use(cors());
app.use(express.json({limit : '10mb'}));

//api routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/uploads',uploadRoutes);

const uploadsDir=path.join(__dirname,'uploads');
if(!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir,{recursive:true});
}

app.use('/uploads',express.static(uploadsDir));
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.get('/health', (req, res) =>{
    res.json({ status: 'ok' })
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () =>{
    console.log(`Server running on http://localhost:${PORT}`)
});
