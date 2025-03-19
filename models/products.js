import mongoose from "mongoose"

const productSchema = new mongoose.Schema({
    date: String,
    name: String,
    id: String,
    category: String,
    stock: Number,
    order: Number,
    difference: Number,
    filePath: String,
    userId: String
})

const productModel = mongoose.model('products', productSchema)

export default productModel