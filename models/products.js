const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    date: String,
    name: String,
    id: String,
    category: String,
    stock: Number,
    order: Number,
    difference: Number,
    filePath: String
})

const productModel = mongoose.model('products', productSchema)


module.exports = productModel