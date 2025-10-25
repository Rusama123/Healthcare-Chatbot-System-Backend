import express from 'express';
import mongoose from 'mongoose';
import Inventory from '../models/Inventory.js';
import Supplier from '../models/Supplier.js';

const router = express.Router();

// ============================================
// INVENTORY ROUTES
// ============================================

// Get all inventory items with pagination and search
router.get('/inventory', async (req, res) => {
  try {
    const { search, category, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    
    if (search) {
      query.$or = [
        { brandName: { $regex: search, $options: 'i' } },
        { genericName: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (category && category !== 'All Categories') {
      query.category = category;
    }

    const total = await Inventory.countDocuments(query);
    const inventory = await Inventory.find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    res.json({
      inventory,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching inventory', error: err.message });
  }
});

// Get inventory by barcode
router.get('/inventory/barcode/:barcode', async (req, res) => {
  try {
    const item = await Inventory.findOne({ barcode: req.params.barcode });
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching item', error: err.message });
  }
});

// Get single inventory item
router.get('/inventory/:id', async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching item', error: err.message });
  }
});

// Add new inventory item
router.post('/inventory', async (req, res) => {
  try {
    const { brandName, genericName, dosage, category, unitPrice, boxPrice, unitsPerBox, batches } = req.body;

    const currentStock = batches.reduce((sum, batch) => sum + batch.quantity, 0);

    const newItem = new Inventory({
      brandName,
      genericName,
      dosage,
      category,
      currentStock,
      unitPrice,
      boxPrice,
      unitsPerBox,
      batches
    });

    await newItem.save();
    res.json({ message: 'Inventory item added successfully!', item: newItem });
  } catch (err) {
    res.status(500).json({ message: 'Error adding inventory', error: err.message });
  }
});

// Update inventory item
router.put('/inventory/:id', async (req, res) => {
  try {
    const { brandName, genericName, dosage, category, unitPrice, boxPrice, unitsPerBox, batches } = req.body;

    const currentStock = batches.reduce((sum, batch) => sum + batch.quantity, 0);

    const updatedItem = await Inventory.findByIdAndUpdate(
      req.params.id,
      {
        brandName,
        genericName,
        dosage,
        category,
        currentStock,
        unitPrice,
        boxPrice,
        unitsPerBox,
        batches
      },
      { new: true }
    );

    if (!updatedItem) {
      return res.status(404).json({ message: 'Item not found' });
    }

    res.json({ message: 'Inventory updated successfully!', item: updatedItem });
  } catch (err) {
    res.status(500).json({ message: 'Error updating inventory', error: err.message });
  }
});

// Delete inventory item
router.delete('/inventory/:id', async (req, res) => {
  try {
    const deletedItem = await Inventory.findByIdAndDelete(req.params.id);
    
    if (!deletedItem) {
      return res.status(404).json({ message: 'Item not found' });
    }

    res.json({ message: 'Inventory item deleted successfully!' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting inventory', error: err.message });
  }
});

// Get all categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Inventory.distinct('category');
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching categories', error: err.message });
  }
});

// ============================================
// ALERTS ROUTE
// ============================================

router.get('/alerts', async (req, res) => {
  try {
    const allItems = await Inventory.find({});
    
    const expiringItems = [];
    const reorderItems = [];
    const today = new Date();

    allItems.forEach(item => {
      // Check for low stock (10 or less)
      if (item.currentStock <= 10) {
        reorderItems.push({
          brandName: item.brandName,
          genericName: item.genericName,
          currentStock: item.currentStock,
          category: item.category,
          _id: item._id
        });
      }

      // Check each batch for expiry alerts
      if (item.batches && item.batches.length > 0) {
        item.batches.forEach(batch => {
          const expiryDate = new Date(batch.expiryDate);
          const diffTime = expiryDate - today;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          // Alert for items expiring in 15 days or less, or already expired
          if (diffDays <= 15) {
            expiringItems.push({
              brandName: item.brandName,
              genericName: item.genericName,
              batchNumber: batch.batchNumber,
              quantity: batch.quantity,
              expiryDate: batch.expiryDate,
              daysRemaining: diffDays,
              itemId: item._id,
              category: item.category
            });
          }
        });
      }
    });

    // Sort expiring items by days remaining (most urgent first)
    expiringItems.sort((a, b) => a.daysRemaining - b.daysRemaining);

    // Sort reorder items by stock level (lowest first)
    reorderItems.sort((a, b) => a.currentStock - b.currentStock);

    res.json({
      expiringItems,
      reorderItems,
      summary: {
        totalExpiring: expiringItems.length,
        totalReorder: reorderItems.length,
        criticalExpiry: expiringItems.filter(item => item.daysRemaining <= 3).length,
        outOfStock: reorderItems.filter(item => item.currentStock === 0).length
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching alerts', error: err.message });
  }
});

// ============================================
// DASHBOARD ROUTE
// ============================================

router.get('/dashboard', async (req, res) => {
  try {
    console.log('Dashboard route called');
    
    const allItems = await Inventory.find({});
    console.log('Total inventory items:', allItems.length);
    
    // Calculate Total Inventory Value
    const totalInventoryValue = allItems.reduce((sum, item) => {
      const value = (item.currentStock || 0) * (item.unitPrice || 0);
      return sum + value;
    }, 0);

    // Count Low Stock Items (10 or less)
    const lowStockCount = allItems.filter(item => item.currentStock <= 10).length;

    // Count Expiring Soon Items (within 15 days)
    let expiringSoonCount = 0;
    const today = new Date();
    
    allItems.forEach(item => {
      if (item.batches && item.batches.length > 0) {
        item.batches.forEach(batch => {
          const expiryDate = new Date(batch.expiryDate);
          const diffTime = expiryDate - today;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays <= 15 && diffDays >= 0) {
            expiringSoonCount++;
          }
        });
      }
    });

    // Get Sales Data
    let totalSalesValue = 0;
    let recentSales = [];

    try {
      const Sales = mongoose.models.Sales || mongoose.model('Sales');
      
      const salesAgg = await Sales.aggregate([
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]);
      totalSalesValue = salesAgg.length > 0 ? salesAgg[0].total : 0;
      
      recentSales = await Sales.find()
        .sort({ date: -1 })
        .limit(10)
        .lean();
    } catch (salesErr) {
      console.log('Sales data not available:', salesErr.message);
      totalSalesValue = 0;
      recentSales = [];
    } 

    constresponse = {
      totalInventoryValue: totalInventoryValue || 0,
      lowStockCount: lowStockCount || 0,
      expiringSoonCount: expiringSoonCount || 0,
      totalSalesValue: totalSalesValue || 0,
      recentSales: recentSales || []
    };

    console.log('Dashboard response:', response);
    res.json(response);
    
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ 
      message: 'Error fetching dashboard data', 
      error: err.message,
      totalInventoryValue: 0,
      lowStockCount: 0,
      expiringSoonCount: 0,
      totalSalesValue: 0,
      recentSales: []
    });
  }
});

// ============================================
// SUPPLIER ROUTES
// ============================================

// Get all suppliers
router.get('/suppliers', async (req, res) => {
  try {
    const suppliers = await Supplier.find().sort({ createdAt: -1 });
    res.json(suppliers);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching suppliers', error: err.message });
  }
});

// Get single supplier
router.get('/suppliers/:id', async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    res.json(supplier);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching supplier', error: err.message });
  }
});

// Add new supplier
router.post('/suppliers', async (req, res) => {
  try {
    const newSupplier = new Supplier(req.body);
    await newSupplier.save();
    res.json({ message: 'Supplier added successfully!', supplier: newSupplier });
  } catch (err) {
    res.status(500).json({ message: 'Error adding supplier', error: err.message });
  }
});

// Update supplier
router.put('/suppliers/:id', async (req, res) => {
  try {
    const updatedSupplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedSupplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    res.json({ message: 'Supplier updated successfully!', supplier: updatedSupplier });
  } catch (err) {
    res.status(500).json({ message: 'Error updating supplier', error: err.message });
  }
});

// Delete supplier
router.delete('/suppliers/:id', async (req, res) => {
  try {
    const deletedSupplier = await Supplier.findByIdAndDelete(req.params.id);
    if (!deletedSupplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    res.json({ message: 'Supplier deleted successfully!' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting supplier', error: err.message });
  }
});

export default router;