import mongoose from 'mongoose';

const salesSchema = new mongoose.Schema({
  inventoryId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Inventory',
    required: true 
  },
  brandName: { 
    type: String, 
    required: true 
  },
  genericName: { 
    type: String 
  },
  quantity: { 
    type: Number, 
    required: true 
  },
  unitPrice: { 
    type: Number, 
    required: true 
  },
  totalAmount: { 
    type: Number, 
    required: true 
  },
  batchNumber: { 
    type: String 
  },
  customerName: { 
    type: String 
  },
  paymentMethod: { 
    type: String,
    enum: ['Cash', 'Card', 'Mobile', 'Credit'],
    default: 'Cash'
  },
  date: { 
    type: Date, 
    default: Date.now 
  }
}, { timestamps: true });

const Sales = mongoose.model('Sales', salesSchema);

export default Sales;