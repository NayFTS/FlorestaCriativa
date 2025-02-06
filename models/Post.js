const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
    title: String,
    content: String,
    url: String,
    image_path: String,
    publish_date: { type: Date, default: Date.now },
    categories: [String],
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } // ✅ Adiciona referência ao usuário
});

module.exports = mongoose.model('Post', PostSchema);
