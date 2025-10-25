import express from 'express';
import Sale from '../models/Sale.js';
import Inventory from '../models/Inventory.js';

const router = express.Router();

// Record a sale
router.post('/sales', async (req, res) => {
  try {
    const { inventoryId, quantity, barcode } = req.body;

    // Find the inventory item
    const item = await Inventory.findById(inventoryId);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Check stock
    if (item.currentStock < quantity) {
      return res.status(400).json({ message: 'Insufficient stock' });
    }

    // Update stock (FIFO - reduce from oldest batch first)
    let remainingQty = quantity;
    const updatedBatches = [...item.batches];
    
    for (let i = 0; i < updatedBatches.length && remainingQty > 0; i++) {
      if (updatedBatches[i].quantity >= remainingQty) {
        updatedBatches[i].quantity -= remainingQty;
        remainingQty = 0;
      } else {
        remainingQty -= updatedBatches[i].quantity;
        updatedBatches[i].quantity = 0;
      }
    }

    // Remove empty batches
    const filteredBatches = updatedBatches.filter(b => b.quantity > 0);

    // Update inventory
    await Inventory.findByIdAndUpdate(inventoryId, {
      currentStock: item.currentStock - quantity,
      batches: filteredBatches
    });

    // Create sale record
    const sale = new Sale({
      inventoryId,
      brandName: item.brandName,
      genericName: item.genericName,
      quantity,
      unitPrice: item.unitPrice,
      totalAmount: item.unitPrice * quantity,
      barcode
    });

    await sale.save();

    res.json({ message: 'Sale recorded successfully', sale });
  } catch (err) {
    res.status(500).json({ message: 'Error recording sale', error: err.message });
  }
});

// Get all sales
router.get('/sales', async (req, res) => {
  try {
    const sales = await Sale.find().sort({ createdAt: -1 });
    res.json(sales);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching sales', error: err.message });
  }
});

export default router;