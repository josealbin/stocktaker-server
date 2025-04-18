import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import productModel from './models/products.js';
import userModel from './models/users.js';
import dotenv from 'dotenv'
import authenticateUser from './middleware/auth.js'
import './config/db.js'

const app = express();
app.use(express.json());
dotenv.config({ path: "./config/.env" })
app.use(cors({
    origin: ["https://stocktaker.net", "https://www.stocktaker.net", "https://api.stocktaker.net"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
}));
app.set("trust proxy", 1);

// Saving files for each items -- Not in use 
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'public/files'));
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + "_" + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage })



//---------------------------------------------------//
//---------------------Inventory---------------------//
//-------------------------------------------------//

app.get('/getProducts', authenticateUser, (req, res) => {
    productModel.find({ userId: req.user.id })
        .then(products => res.json(products))
        .catch(err => res.json(err))
})

// Add new Product record into database
app.post('/addProduct', authenticateUser, upload.single('file'), (req, res) => {
    const newProduct = { ...req.body, userId: req.user.id };
    if (req.file) {
        newProduct.filePath = req.file.path; // Save the file path in the product data
    }
    productModel.create(newProduct)
        .then(products => res.json(products))
        .catch(err => res.status(500).json({ message: err.message }))
})

// Get the Product by ID and Edit the product record
app.get('/getProduct/:id', authenticateUser, (req, res) => {
    const id = req.params.id
    productModel.findOne({ _id: id, userId: req.user.id })
        .then(product => {
            if (!product) return res.status(404).json({ message: "Product not found" });
            res.json(product);
        })
        .catch(err => res.status(500).json({ message: err.message }));
})
app.put('/updateProduct/:id', authenticateUser, (req, res) => {
    const id = req.params.id
    const updatedData = req.body;
    productModel.findOneAndUpdate({ _id: id, userId: req.user.id }, updatedData, { new: true })
        .then(product => {
            if (!product) return res.status(404).json({ message: "Product not found or not authorized" });
            res.json(product)
        })
        .catch(err => res.status(500).json({ message: err.message }));

})
// Delete the Product
app.delete('/deleteProduct/:id', authenticateUser, (req, res) => {
    const id = req.params.id
    productModel.findOneAndDelete({ _id: id, userId: req.user.id })
        .then(product => {
            if (!product) return res.status(404).json({ message: "Product not found or not authorized" });
            res.json({ message: "Product deleted successfully" });
        })
        .catch(err => res.status(500).json({ message: err.message }));
})


//---------------------------------------------------//
//---------------------File Upload--------------------//
//-------------------------------------------------//

app.post('/updateData', authenticateUser, (req, res) => {
    const { updatedTableData } = req.body;
    const bulkOps = updatedTableData.map(product => ({
        updateOne: {
            filter: { id: product.id, userId: req.user.id },
            update: {
                $set: {
                    order: product.order,
                    difference: product.stock - product.order,
                    stock: product.stock - product.order
                }
            }
        }
    }));
    productModel.bulkWrite(bulkOps)
        .then(() => res.status(200).json({ message: 'Products updated successfully' }))
        .catch(err => res.status(500).json({ message: err.message }));
});


// needs to be fixed....
app.put('/resetOrders', authenticateUser, async (req, res) => {
    try {
        await productModel.updateMany({}, { $set: { order: 0 } });
        res.json({ message: "All orders reset to zero" });
    } catch (error) {
        res.status(500).json({ error: "Error resetting orders" });
    }
});



//---------------------------------------------------//
//---------------------Users--------------------//
//-------------------------------------------------//

app.get('/getUsers', (req, res) => {
    userModel.find({})
        .then(users => res.json(users))
        .catch(err => res.json(err))
})

app.post('/signup', async (req, res) => {
    const { username, email, password } = req.body;
    const user = await userModel.findOne({ email })
    if (user) {
        return res.json({ message: "User already existed!" })
    }

    const hashpassword = await bcrypt.hash(password, 10)
    const newUser = new userModel({ username, email, password: hashpassword })
    await newUser.save()
    return res.json({ status: true, message: "User Added!" })
})

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await userModel.findOne({ email })
    if (!user) {
        return res.json({ message: "User is not registered!" })
    }
    const validPassword = await bcrypt.compare(password, user.password)
    if (!validPassword) {
        return res.json({ message: "Incorrect Password!" })
    }

    const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET_KEY);
    return res.json({ status: true, message: "Logged In", token, username: user.username })
})


//---------------------------------------------------//
//---------------------Admin--------------------//
//-------------------------------------------------//

app.post('/admin-login', (req, res) => {
    const { email, password } = req.body;
  
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (email !== adminEmail) {
      return res.status(401).json({ message: 'Invalid admin email' });
    }
  
    if (password !== adminPassword) {
      return res.status(401).json({ message: 'Incorrect admin password' });
    }
  
    const token = jwt.sign(
      { email, role: 'admin' },
      process.env.JWT_SECRET_KEY,
      { expiresIn: '1h' }
    );
  
    return res.status(200).json({
      status: true,
      message: 'Admin logged in',
      token,
      username: 'admin'
    });
  });


app.listen(process.env.PORT, () => {
    console.log('Server Started');
})