const mongoose = require('mongoose')

const customerSchema = new mongoose.Schema({
    date: String,
    name: String,
    region: String,
    email: String,
    website: String,
    phone: Number,
    status: String
})

const customerModel = mongoose.model('customers', customerSchema)


module.exports = customerModel