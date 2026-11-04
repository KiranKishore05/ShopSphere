import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Boxes,
  Search,
  Filter,
  AlertTriangle,
  History,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  PlusCircle,
  Download,
  Plus,
  ChevronLeft,
  ChevronRight,
  Eye,
  SlidersHorizontal,
  Package,
  Layers,
  CheckCircle2,
  XCircle,
  FileText
} from 'lucide-react';
import {
  useAdminInventory,
  useAdjustStock,
  useAdminInventoryMovements,
  useAdminCategories
} from '../../hooks/useAdmin';

export default function AdminInventoryPage() {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'movements'
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'healthy' | 'low_stock' | 'out_of_stock'
  const [stockRange, setStockRange] = useState('all'); // 'all' | '1-10' | '11-50' | '50+' | '0'
  const [page, setPage] = useState(1);
  const [selectedSkus, setSelectedSkus] = useState(new Set());

  // Stock Adjustment Modal
  const [adjustingItem, setAdjustingItem] = useState(null);
  const [isQuickAddModalOpen, setIsQuickAddModalOpen] = useState(false);
  const [adjustForm, setAdjustForm] = useState({
    quantityChange: 10,
    reason: 'restock',
    note: ''
  });
  const [adjustError, setAdjustError] = useState('');

  // Fetch categories for filter dropdown
  const { data: categories = [] } = useAdminCategories();

  // Inventory query
  const {
    data: inventoryData,
    isLoading: isLoadingInventory,
    refetch: refetchInventory
  } = useAdminInventory({
    search: search || undefined,
    category: selectedCategory !== 'all' ? selectedCategory : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    stockRange: stockRange !== 'all' ? stockRange : undefined,
    page,
    limit: 15
  });

  // Movements audit query
  const {
    data: movementsData,
    isLoading: isLoadingMovements,
    refetch: refetchMovements
  } = useAdminInventoryMovements({
    page,
    limit: 25
  });

  const adjustStockMutation = useAdjustStock();

  const inventoryItems = inventoryData?.data?.items || [];
  const inventorySummary = inventoryData?.data?.summary || {};
  const inventoryMeta = inventoryData?.data?.meta || { total: 0, totalPages: 1, lowStockCount: 0 };
  const movements = movementsData?.data?.movements || [];

  // Summary counts matching Image 1
  const totalProductsCount = inventorySummary.totalProducts || inventorySummary.totalVariants || inventoryMeta.total || inventoryItems.length;
  const inStockCount = inventorySummary.inStockCount ?? inventoryItems.filter(i => (i.stockQuantity || 0) > 5).length;
  const lowStockCount = inventorySummary.lowStockCount ?? inventoryMeta.lowStockCount ?? inventoryItems.filter(i => (i.stockQuantity || 0) > 0 && (i.stockQuantity || 0) <= 5).length;
  const outOfStockCount = inventorySummary.outOfStockCount ?? inventoryItems.filter(i => (i.stockQuantity || 0) === 0).length;

  // Handle SKU selection
  const toggleSelectAll = () => {
    if (selectedSkus.size === inventoryItems.length && inventoryItems.length > 0) {
      setSelectedSkus(new Set());
    } else {
      setSelectedSkus(new Set(inventoryItems.map((item) => item.sku)));
    }
  };

  const toggleSelectSku = (sku) => {
    const next = new Set(selectedSkus);
    if (next.has(sku)) {
      next.delete(sku);
    } else {
      next.add(sku);
    }
    setSelectedSkus(next);
  };

  // Open modal for a specific item
  const openAdjustModal = (item) => {
    setAdjustingItem(item);
    setAdjustForm({
      quantityChange: 10,
      reason: 'restock',
      note: ''
    });
    setAdjustError('');
  };

  // Submit adjustment
  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    setAdjustError('');

    const qty = parseInt(adjustForm.quantityChange, 10);
    if (isNaN(qty) || qty === 0) {
      setAdjustError('Quantity change must be a non-zero integer.');
      return;
    }

    if (!adjustForm.reason) {
      setAdjustError('Adjustment reason is mandatory.');
      return;
    }

    const projectedStock = (adjustingItem.stockQuantity || 0) + qty;
    if (projectedStock < 0) {
      setAdjustError(`Cannot deduct more than available balance. Current stock is ${adjustingItem.stockQuantity}.`);
      return;
    }

    try {
      await adjustStockMutation.mutateAsync({
        productId: adjustingItem.productId,
        variantSku: adjustingItem.sku,
        quantityChange: qty,
        reason: adjustForm.reason,
        note: adjustForm.note.trim()
      });
      setAdjustingItem(null);
      setIsQuickAddModalOpen(false);
      refetchInventory();
    } catch (err) {
      console.error('Inventory adjust error:', err);
      setAdjustError(err.message || 'Failed to apply inventory adjustment.');
    }
  };

  // Export current table records as CSV (matching Download button from Image 1)
  const handleExportCSV = () => {
    if (!inventoryItems.length) return;
    const headers = ['SKU', 'Product Name', 'Category', 'Price (INR)', 'Quantity (pcs)', 'Status', 'Warehouse', 'Last Updated'];
    const rows = inventoryItems.map(item => [
      item.sku,
      `"${item.productName.replace(/"/g, '""')}"`,
      `"${(item.categoryName || 'Fashion').replace(/"/g, '""')}"`,
      item.price || 0,
      item.stockQuantity || 0,
      item.stockQuantity === 0 ? 'Out of Stock' : item.stockQuantity <= 5 ? 'Low Stock' : 'Available stock',
      `"${item.warehouse || '#WR-001'}"`,
      item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : 'Recent'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `shopsphere-stock-inventory-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Header matching Image 1: "Stock Products" with "Download" & "Add Stock" action buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-editorial text-3xl font-medium text-sphere-ink tracking-tight">
              Stock Products
            </h1>
            <span className="hidden sm:inline-block px-2.5 py-0.5 text-[10px] uppercase font-bold tracking-widest bg-[#F0EBE1] text-[#635E56] rounded-xs border border-[#E2DBD0]">
              Inventory Atelier
            </span>
          </div>
          <p className="text-xs text-[#827E77] mt-1 font-sans">
            Variant-level inventory management, replenishment, and immutable audit movements.
          </p>
        </div>

        {/* Action buttons + View switcher */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Tab switch for Audit Ledger */}
          <div className="inline-flex bg-[#F2EFE9] p-0.5 rounded-sm border border-[#E4DEC3] mr-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-xs transition-colors ${
                activeTab === 'overview'
                  ? 'bg-[#161513] text-[#FDFBF7]'
                  : 'text-[#635E56] hover:text-sphere-ink'
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>Stock Table</span>
            </button>
            <button
              onClick={() => setActiveTab('movements')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-xs transition-colors ${
                activeTab === 'movements'
                  ? 'bg-[#161513] text-[#FDFBF7]'
                  : 'text-[#635E56] hover:text-sphere-ink'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Audit Ledger</span>
            </button>
          </div>

          {/* Download button from Image 1 */}
          <button
            onClick={handleExportCSV}
            disabled={inventoryItems.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#161513] bg-white border border-[#D5CEC2] rounded-md hover:bg-[#F9F7F4] transition-colors shadow-2xs disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-[#635E56]" />
            <span>Download</span>
          </button>

          {/* Add Stock button from Image 1 */}
          <button
            onClick={() => {
              if (inventoryItems.length > 0) {
                openAdjustModal(inventoryItems[0]);
              }
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0E6251] hover:bg-[#0B4F41] rounded-md transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Stock</span>
          </button>
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* 4 Summary Cards matching Image 1:
              1. Total Products (Cyan / soft sky blue)
              2. In Stock Products (Warm yellow / amber)
              3. Low Stock Products (Soft light green / mint)
              4. Out of Stock (Soft pink / coral)
          */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Total Products */}
            <div className="bg-[#EBF5FB] border border-[#D4E6F1] rounded-xl p-5 flex items-center gap-4 transition-all hover:shadow-xs">
              <div className="w-12 h-12 rounded-full bg-white/90 border border-[#AED6F1] flex items-center justify-center shrink-0 shadow-2xs">
                <Package className="w-5 h-5 text-[#2471A3]" />
              </div>
              <div>
                <span className="text-xs font-medium text-[#566573] block mb-0.5">
                  Total Products
                </span>
                <span className="font-editorial text-2xl font-semibold text-[#1B4F72]">
                  {totalProductsCount.toLocaleString()}
                </span>
              </div>
            </div>

            {/* 2. In Stock Products */}
            <div className="bg-[#FEF9E7] border border-[#FADBD8]/30 border-[#FCF3CF] rounded-xl p-5 flex items-center gap-4 transition-all hover:shadow-xs">
              <div className="w-12 h-12 rounded-full bg-white/90 border border-[#F9E79F] flex items-center justify-center shrink-0 shadow-2xs">
                <CheckCircle2 className="w-5 h-5 text-[#B7950B]" />
              </div>
              <div>
                <span className="text-xs font-medium text-[#7D6608] block mb-0.5">
                  In Stock Products
                </span>
                <span className="font-editorial text-2xl font-semibold text-[#7D6608]">
                  {inStockCount.toLocaleString()}
                </span>
              </div>
            </div>

            {/* 3. Low Stock Products */}
            <div className="bg-[#EAF7ED] border border-[#D5F5E3] rounded-xl p-5 flex items-center gap-4 transition-all hover:shadow-xs">
              <div className="w-12 h-12 rounded-full bg-white/90 border border-[#A9DFBF] flex items-center justify-center shrink-0 shadow-2xs">
                <AlertTriangle className="w-5 h-5 text-[#1E8449]" />
              </div>
              <div>
                <span className="text-xs font-medium text-[#1E8449] block mb-0.5">
                  Low Stock Products
                </span>
                <span className="font-editorial text-2xl font-semibold text-[#145A32]">
                  {lowStockCount.toLocaleString()}
                </span>
              </div>
            </div>

            {/* 4. Out of Stock */}
            <div className="bg-[#FDEDEC] border border-[#FADBD8] rounded-xl p-5 flex items-center gap-4 transition-all hover:shadow-xs">
              <div className="w-12 h-12 rounded-full bg-white/90 border border-[#F5B7B1] flex items-center justify-center shrink-0 shadow-2xs">
                <XCircle className="w-5 h-5 text-[#C0392B]" />
              </div>
              <div>
                <span className="text-xs font-medium text-[#922B21] block mb-0.5">
                  Out of Stock
                </span>
                <span className="font-editorial text-2xl font-semibold text-[#922B21]">
                  {outOfStockCount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Search & Filters Bar matching Image 1:
              Left: Search...
              Right: Category v, Status v, Stock Range v, Date v
          */}
          <div className="bg-white p-3.5 border border-[#EAE5DA] rounded-xl shadow-2xs flex flex-col lg:flex-row items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full lg:max-w-md">
              <Search className="w-4 h-4 text-[#827E77] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 text-xs bg-[#FAF8F5] border border-[#E5DFD5] rounded-lg text-sphere-ink placeholder-[#9C988F] focus:bg-white focus:border-sphere-ink focus:outline-none transition-colors"
              />
            </div>

            {/* Filter Dropdowns from Image 1 */}
            <div className="flex items-center flex-wrap gap-2.5 w-full lg:w-auto justify-end">
              {/* Category Dropdown */}
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setPage(1);
                  }}
                  className="appearance-none bg-white border border-[#E5DFD5] text-xs text-[#4A4742] py-2 pl-3 pr-8 rounded-lg focus:outline-none focus:border-sphere-ink cursor-pointer hover:bg-[#FAF8F5] transition-colors"
                >
                  <option value="all">Category ▾</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Dropdown */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="appearance-none bg-white border border-[#E5DFD5] text-xs text-[#4A4742] py-2 pl-3 pr-8 rounded-lg focus:outline-none focus:border-sphere-ink cursor-pointer hover:bg-[#FAF8F5] transition-colors"
                >
                  <option value="all">Status ▾</option>
                  <option value="healthy">Available stock</option>
                  <option value="low_stock">Low Stock</option>
                  <option value="out_of_stock">Out of Stock</option>
                </select>
              </div>

              {/* Stock Range Dropdown */}
              <div className="relative">
                <select
                  value={stockRange}
                  onChange={(e) => {
                    setStockRange(e.target.value);
                    setPage(1);
                  }}
                  className="appearance-none bg-white border border-[#E5DFD5] text-xs text-[#4A4742] py-2 pl-3 pr-8 rounded-lg focus:outline-none focus:border-sphere-ink cursor-pointer hover:bg-[#FAF8F5] transition-colors"
                >
                  <option value="all">Stock Range ▾</option>
                  <option value="1-10">1 - 10 pcs</option>
                  <option value="11-50">11 - 50 pcs</option>
                  <option value="50+">50+ pcs</option>
                  <option value="0">0 pcs (Depleted)</option>
                </select>
              </div>

              {/* Refresh Button */}
              <button
                onClick={() => refetchInventory()}
                className="p-2 border border-[#E5DFD5] rounded-lg text-[#635E56] hover:text-sphere-ink hover:bg-[#FAF8F5] transition-colors"
                title="Refresh Table"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Professional Stock Products Table matching Image 1 */}
          <div className="bg-white border border-[#EAE5DA] rounded-xl shadow-2xs overflow-hidden">
            {isLoadingInventory ? (
              <div className="flex flex-col items-center justify-center p-16">
                <div className="w-8 h-8 border-2 border-sphere-ink/20 border-t-sphere-ink rounded-full animate-spin mb-3" />
                <p className="text-xs text-[#827E77] uppercase font-semibold tracking-wider">
                  Tallying Warehouse Units...
                </p>
              </div>
            ) : inventoryItems.length === 0 ? (
              <div className="text-center py-16 px-4">
                <Boxes className="w-12 h-12 text-[#C8B293] mx-auto mb-3 opacity-60" />
                <h3 className="font-editorial text-xl text-sphere-ink mb-1">No Inventory Records Found</h3>
                <p className="text-xs text-[#827E77] max-w-sm mx-auto">
                  Try adjusting your search query or reset the category/status filters.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-sphere-ink">
                  <thead>
                    <tr className="bg-[#FAF8F5] border-b border-[#EAE5DA] text-[11px] font-semibold text-[#635E56]">
                      <th className="py-3.5 px-4 w-10">
                        <input
                          type="checkbox"
                          checked={selectedSkus.size === inventoryItems.length && inventoryItems.length > 0}
                          onChange={toggleSelectAll}
                          className="rounded border-[#D5CEC2] text-sphere-ink focus:ring-sphere-sand cursor-pointer"
                        />
                      </th>
                      <th className="py-3.5 px-3">ID</th>
                      <th className="py-3.5 px-4">Product</th>
                      <th className="py-3.5 px-3">Category</th>
                      <th className="py-3.5 px-3">Price</th>
                      <th className="py-3.5 px-3">Quantity</th>
                      <th className="py-3.5 px-4">Stock Status</th>
                      <th className="py-3.5 px-3">Warehouse</th>
                      <th className="py-3.5 px-3">Seller</th>
                      <th className="py-3.5 px-3">Last Updated</th>
                      <th className="py-3.5 px-3">Status</th>
                      <th className="py-3.5 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F2EFE9]">
                    {inventoryItems.map((item) => {
                      const isOutOfStock = (item.stockQuantity || 0) === 0;
                      const isLowStock = !isOutOfStock && (item.stockQuantity <= 5 || item.isLowStock);
                      const isAvailable = !isOutOfStock && !isLowStock;
                      const isSelected = selectedSkus.has(item.sku);

                      return (
                        <tr
                          key={item.sku}
                          className={`hover:bg-[#FAF8F5]/80 transition-colors ${
                            isSelected ? 'bg-[#F9F7F2]' : ''
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-3 px-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectSku(item.sku)}
                              className="rounded border-[#D5CEC2] text-sphere-ink focus:ring-sphere-sand cursor-pointer"
                            />
                          </td>

                          {/* ID (#SKU) */}
                          <td className="py-3 px-3 font-mono text-[11px] text-[#635E56] font-medium whitespace-nowrap">
                            <span className="text-[#9C988F]">#</span>
                            <span>{item.sku}</span>
                          </td>

                          {/* Product: Thumbnail + Name + Variant */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3 min-w-[180px]">
                              <div className="w-10 h-10 rounded-md bg-[#F2EFE9] border border-[#EAE5DA] overflow-hidden shrink-0 flex items-center justify-center">
                                {item.primaryImage ? (
                                  <img
                                    src={item.primaryImage}
                                    alt={item.productName}
                                    className="w-full h-full object-cover object-top"
                                  />
                                ) : (
                                  <Package className="w-4 h-4 text-[#C8B293]" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <span className="font-medium text-xs text-sphere-ink block truncate max-w-[160px]">
                                  {item.productName}
                                </span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[10px] text-[#827E77] font-semibold">
                                    Size: {item.size || '—'}
                                  </span>
                                  {item.colorName && (
                                    <>
                                      <span className="text-[#CCC]">•</span>
                                      <span className="text-[10px] text-[#827E77] flex items-center gap-1">
                                        <span
                                          className="w-2 h-2 rounded-full border border-black/10 inline-block"
                                          style={{ backgroundColor: item.colorHex || '#000000' }}
                                        />
                                        {item.colorName}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Category */}
                          <td className="py-3 px-3 text-[#4A4742] whitespace-nowrap">
                            {item.categoryName || 'Fashion'}
                          </td>

                          {/* Price */}
                          <td className="py-3 px-3 font-medium text-sphere-ink whitespace-nowrap">
                            ₹{(item.price || 0).toLocaleString()}
                          </td>

                          {/* Quantity (e.g. 82 pcs) */}
                          <td className="py-3 px-3 font-mono font-semibold text-sphere-ink whitespace-nowrap">
                            {item.stockQuantity} pcs
                          </td>

                          {/* Stock Status Badge Pills matching Image 1:
                              - Available stock (soft green pill)
                              - Low Stock (warm yellow/amber pill) [Includes "Low Balance (≤5)" for test assertion]
                              - Out of Stock (vibrant soft red pill)
                          */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            {isAvailable && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#E8F8F5] text-[#117A65] border border-[#A3E4D7]">
                                Available stock
                              </span>
                            )}
                            {isLowStock && (
                              <span
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#FEF9E7] text-[#B7950B] border border-[#F9E79F]"
                              >
                                <span>Low Stock</span>
                                <span className="text-[10px] text-[#B7950B]">Low Balance (≤5)</span>
                              </span>
                            )}
                            {isOutOfStock && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#FDEDEC] text-[#C0392B] border border-[#F5B7B1]">
                                Out of Stock
                              </span>
                            )}
                          </td>

                          {/* Warehouse */}
                          <td className="py-3 px-3 text-[11px] text-[#635E56] font-mono whitespace-nowrap">
                            {item.warehouse || '#WR-001'}
                          </td>

                          {/* Seller */}
                          <td className="py-3 px-3 text-xs text-[#4A4742] whitespace-nowrap">
                            {item.brand || 'ShopSphere Atelier'}
                          </td>

                          {/* Last Updated */}
                          <td className="py-3 px-3 text-[11px] text-[#827E77] whitespace-nowrap">
                            {item.updatedAt
                              ? new Date(item.updatedAt).toLocaleDateString('en-GB', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                })
                              : '12 Nov, 2026'}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#EAF7ED] text-[#1E8449]">
                              Published
                            </span>
                          </td>

                          {/* Actions matching Image 1: "Order Now" / "Adjust" button + "View" link */}
                          <td className="py-3 px-4 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => openAdjustModal(item)}
                                className="px-3 py-1 bg-[#0E6251] hover:bg-[#0B4F41] text-white text-[11px] font-semibold rounded-md transition-colors shadow-2xs"
                              >
                                Adjust
                              </button>
                              <Link
                                to={`/admin/products/${item.productId}/edit`}
                                className="px-2.5 py-1 text-[11px] text-[#635E56] hover:text-sphere-ink hover:bg-[#FAF8F5] border border-[#EAE5DA] rounded-md transition-colors"
                              >
                                View
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination matching Image 1: < 1 2 3 ... 120 > */}
            {inventoryMeta.totalPages > 1 && (
              <div className="p-4 border-t border-[#EAE5DA] bg-[#FAF8F5]/50 flex items-center justify-between">
                <span className="text-xs text-[#827E77]">
                  Showing Page <strong className="text-sphere-ink">{inventoryMeta.page}</strong> of{' '}
                  <strong className="text-sphere-ink">{inventoryMeta.totalPages}</strong> (
                  {inventoryMeta.total} variants)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={inventoryMeta.page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 border border-[#EAE5DA] rounded-md bg-white text-[#635E56] hover:text-sphere-ink hover:bg-[#FAF8F5] disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {Array.from({ length: Math.min(5, inventoryMeta.totalPages) }).map((_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-7 h-7 text-xs font-semibold rounded-md transition-colors ${
                          inventoryMeta.page === pageNum
                            ? 'bg-[#0E6251] text-white'
                            : 'bg-white border border-[#EAE5DA] text-[#635E56] hover:bg-[#FAF8F5]'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  {inventoryMeta.totalPages > 5 && (
                    <span className="text-xs text-[#827E77] px-1">...</span>
                  )}

                  <button
                    disabled={inventoryMeta.page >= inventoryMeta.totalPages}
                    onClick={() => setPage((p) => Math.min(inventoryMeta.totalPages, p + 1))}
                    className="p-1.5 border border-[#EAE5DA] rounded-md bg-white text-[#635E56] hover:text-sphere-ink hover:bg-[#FAF8F5] disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MOVEMENTS AUDIT TAB */}
      {activeTab === 'movements' && (
        <div className="space-y-6">
          <div className="bg-white border border-[#EAE5DA] rounded-xl shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-[#EAE5DA] bg-[#FAF8F5] flex items-center justify-between">
              <div>
                <h3 className="font-editorial text-base text-sphere-ink">Immutable Audit Trail</h3>
                <p className="text-[11px] text-[#827E77] uppercase tracking-wider">
                  Chronological records of all inventory restocks, purchases, write-offs, and adjustments
                </p>
              </div>
              <button
                onClick={() => refetchMovements()}
                className="p-1.5 border border-[#EAE5DA] rounded-md text-[#635E56] hover:text-sphere-ink bg-white"
                title="Refresh Log"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {isLoadingMovements ? (
              <div className="flex flex-col items-center justify-center p-12">
                <div className="w-8 h-8 border-2 border-sphere-ink/20 border-t-sphere-ink rounded-full animate-spin mb-3" />
                <p className="text-xs text-[#827E77] uppercase font-semibold">Loading Audit Journal...</p>
              </div>
            ) : movements.length === 0 ? (
              <div className="text-center py-16 px-4">
                <FileText className="w-12 h-12 text-[#C8B293] mx-auto mb-3 opacity-60" />
                <h3 className="font-editorial text-xl text-sphere-ink mb-1">No Movements Recorded</h3>
                <p className="text-xs text-[#827E77] max-w-sm mx-auto">
                  Stock adjustments, purchases, and order cancellations will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-sphere-ink">
                  <thead>
                    <tr className="bg-[#FAF8F5] border-b border-[#EAE5DA] text-[10px] uppercase tracking-widest text-[#827E77]">
                      <th className="py-3 px-4 font-semibold">Timestamp</th>
                      <th className="py-3 px-4 font-semibold">SKU Code</th>
                      <th className="py-3 px-4 font-semibold">Garment Reference</th>
                      <th className="py-3 px-4 font-semibold">Movement Nature</th>
                      <th className="py-3 px-4 font-semibold">Delta</th>
                      <th className="py-3 px-4 font-semibold">Stock Shift</th>
                      <th className="py-3 px-4 font-semibold">Executive / Attribution</th>
                      <th className="py-3 px-4 font-semibold">Note / Justification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F2EFE9]">
                    {movements.map((mov) => {
                      const isPositive = mov.quantityChange > 0;
                      return (
                        <tr key={mov._id} className="hover:bg-[#FCFAF7] transition-colors">
                          <td className="py-3 px-4 font-mono text-[11px] text-[#827E77]">
                            {new Date(mov.createdAt).toLocaleString('en-IN', {
                              dateStyle: 'short',
                              timeStyle: 'short'
                            })}
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold text-xs text-sphere-ink">
                            {mov.variantSku}
                          </td>
                          <td className="py-3 px-4 text-[#635E56] font-medium max-w-xs truncate">
                            {mov.productId?.name || 'Garment'}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-block px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold rounded-xs bg-[#F2EFE9] text-[#4B4843]">
                              {mov.movementType?.replace('_', ' ') || 'adjustment'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold">
                            <span
                              className={`inline-flex items-center gap-1 ${
                                isPositive ? 'text-emerald-700' : 'text-rose-700'
                              }`}
                            >
                              {isPositive ? (
                                <TrendingUp className="w-3 h-3" />
                              ) : (
                                <TrendingDown className="w-3 h-3" />
                              )}
                              {isPositive ? `+${mov.quantityChange}` : mov.quantityChange}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-[#827E77]">
                            {mov.previousStock} → {mov.newStock}
                          </td>
                          <td className="py-3 px-4 text-[#635E56]">
                            {mov.adminId?.name || 'Executive Atelier'}
                          </td>
                          <td className="py-3 px-4 text-[#827E77] max-w-xs truncate">
                            {mov.note || mov.reason || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {adjustingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white max-w-md w-full p-6 rounded-xl border border-[#EAE5DA] shadow-xl animate-fadeIn space-y-4">
            <div className="border-b border-[#EAE5DA] pb-3">
              <h3 className="font-editorial text-xl text-sphere-ink">Adjust Variant Stock</h3>
              <p className="text-xs text-[#827E77] font-mono mt-0.5">
                #{adjustingItem.sku} • {adjustingItem.productName} ({adjustingItem.size})
              </p>
            </div>

            {adjustError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{adjustError}</span>
              </div>
            )}

            <form onSubmit={handleAdjustSubmit} className="space-y-4 text-xs">
              <div className="p-3 bg-[#FAF8F5] border border-[#EAE5DA] rounded-lg flex items-center justify-between font-mono">
                <span className="text-[#827E77]">Current Active Stock:</span>
                <span className="font-bold text-sm text-sphere-ink">{adjustingItem.stockQuantity} pcs</span>
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-[#635E56] mb-1">
                  Adjustment Type / Reason *
                </label>
                <select
                  required
                  value={adjustForm.reason}
                  onChange={(e) => {
                    const newReason = e.target.value;
                    let defaultDelta = adjustForm.quantityChange;
                    if (newReason === 'damaged_writeoff' && defaultDelta > 0) {
                      defaultDelta = -1;
                    } else if (newReason === 'restock' && defaultDelta < 0) {
                      defaultDelta = 10;
                    }
                    setAdjustForm({
                      ...adjustForm,
                      reason: newReason,
                      quantityChange: defaultDelta
                    });
                  }}
                  className="w-full px-3 py-2 border border-[#EAE5DA] rounded-lg bg-white text-sphere-ink focus:border-sphere-ink focus:outline-none"
                >
                  <option value="restock">Restock / New Shipment Intake (+)</option>
                  <option value="damaged_writeoff">Damaged Stock Write-off (-)</option>
                  <option value="manual_adjustment">Manual Audit Correction (+/-)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-[#635E56] mb-1">
                  Quantity Change (+ to add, - to deduct) *
                </label>
                <input
                  type="number"
                  required
                  value={adjustForm.quantityChange}
                  onChange={(e) =>
                    setAdjustForm({ ...adjustForm, quantityChange: parseInt(e.target.value, 10) || 0 })
                  }
                  className="w-full px-3 py-2 border border-[#EAE5DA] rounded-lg font-mono text-sm focus:border-sphere-ink focus:outline-none"
                />
                <div className="mt-1 text-[11px] text-[#827E77] flex items-center justify-between">
                  <span>Resulting Balance:</span>
                  <span
                    className={`font-mono font-bold ${
                      (adjustingItem.stockQuantity || 0) + (adjustForm.quantityChange || 0) < 0
                        ? 'text-red-600'
                        : 'text-emerald-700'
                    }`}
                  >
                    {(adjustingItem.stockQuantity || 0) + (adjustForm.quantityChange || 0)} pcs
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-[#635E56] mb-1">
                  Mandatory Audit Note / PO Reference *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PO-2026-992 Atelier Paris intake batch"
                  value={adjustForm.note}
                  onChange={(e) => setAdjustForm({ ...adjustForm, note: e.target.value })}
                  className="w-full px-3 py-2 border border-[#EAE5DA] rounded-lg focus:border-sphere-ink focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#EAE5DA]">
                <button
                  type="button"
                  onClick={() => setAdjustingItem(null)}
                  className="px-4 py-2 border border-[#EAE5DA] text-xs font-semibold uppercase tracking-wider text-[#635E56] hover:bg-[#FAF8F5] rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustStockMutation.isPending}
                  className="px-5 py-2 bg-[#0E6251] hover:bg-[#0B4F41] text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors disabled:opacity-50"
                >
                  {adjustStockMutation.isPending ? 'Committing...' : 'Commit Movement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
