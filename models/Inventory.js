import mongoose from 'mongoose';

const batchSchema = new mongoose.Schema({
  batchNumber: { type: String, required: true },
  quantity: { type: Number, required: true },
  expiryDate: { type: Date, required: true }
});

const inventorySchema = new mongoose.Schema({
  brandName: { type: String, required: true },
  genericName: { type: String, required: true },
  dosage: { type: String, required: true },
  category: { type: String, required: true },
  currentStock: { type: Number, required: true, default: 0 },
  unitPrice: { type: Number, required: true },
  boxPrice: { type: Number, required: true },
  unitsPerBox: { type: Number, required: true, default: 1 },
  barcode: { type: String, unique: true, sparse: true }, // ✅ NEW: Add barcode field
  batches: [batchSchema]
}, { timestamps: true });

const Inventory = mongoose.model('Inventory', inventorySchema);

export default Inventory;