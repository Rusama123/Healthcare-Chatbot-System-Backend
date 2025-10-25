import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  contactPerson: { 
    type: String 
  },
  phone: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String 
  },
  address: { 
    type: String 
  },
  city: { 
    type: String, 
    required: true 
  },
  country: { 
    type: String, 
    required: true 
  },
  lastDeliveryDate: { 
    type: Date 
  },
  totalStockDelivered: { 
    type: Number, 
    default: 0 
  },
  notes: { 
    type: String 
  }
}, { timestamps: true });

const Supplier = mongoose.model('Supplier', supplierSchema);

export default Supplier;