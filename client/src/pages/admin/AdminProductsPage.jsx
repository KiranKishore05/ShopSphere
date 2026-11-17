import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Shirt,
  RefreshCw
} from 'lucide-react';
import { useAdminProducts, useAdminCategories, useDeleteProduct } from '../../hooks/useAdmin';

export default function AdminProductsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [gender, setGender] = useState('');
  const [stock, setStock] = useState('');
  const [status, setStatus] = useState('');
  const [notification, setNotification] = useState(null);
  const [productToDelete, setProductToDelete] = useState(null);

  const { data: categoriesData } = useAdminCategories();
  const {
    data: productsData,
    isLoading,
    isError,
    error,
    refetch
  } = useAdminProducts({
    page,
    limit: 15,
    search: search ? search.trim() : undefined,
    category: category || undefined,
    gender: gender || undefined,
    stock: stock || undefined,
    status: status || undefined
  });

  const deleteProductMutation = useDeleteProduct();

  // Resilient data unwrapping: supports { products: [], meta: {} }, { data: { products: [] } }, or []
  const products =
    productsData?.products ||
    productsData?.data?.products ||
    (Array.isArray(productsData) ? productsData : []);

  const meta =
    productsData?.meta ||
    productsData?.data?.meta || {
      page: 1,
      totalPages: 1,
      total: products.length
    };

  const categories = Array.isArray(categoriesData)
    ? categoriesData
    : Array.isArray(categoriesData?.categories)
    ? categoriesData.categories
    : Array.isArray(categoriesData?.data?.categories)
    ? categoriesData.data.categories
    : [];

  const formatPrice = (val) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val || 0);

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;
    try {
      const res = await deleteProductMutation.mutateAsync(productToDelete._id);
      setNotification({
        type: 'success',
        message: res?.message || `"${productToDelete.name}" has been safely deactivated.`
      });
      setProductToDelete(null);
      setTimeout(() => setNotification(null), 5000);
    } catch (err) {
      console.error('Delete product error:', err);
      setNotification({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to deactivate or delete garment.'
      });
      setTimeout(() => setNotification(null), 5000);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#EAE5DA]">
        <div>
          <h1 className="font-editorial text-3xl font-normal text-sphere-ink tracking-tight">
            Garment Catalogue Oversight
          </h1>
          <p className="text-xs text-[#827E77] mt-1 font-sans">
            Manage haute couture creations, technical specifications, variants, and stock balances.
          </p>
        </div>

        <Link
          to="/admin/products/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#161513] text-[#FDFBF7] text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-[#34302C] transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Garment</span>
        </Link>
      </div>

      {/* Operation Feedback Banner */}
      {notification && (
        <div
          className={`p-3.5 rounded-sm border text-xs flex items-center justify-between ${
            notification.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            ) : (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs font-semibold underline opacity-75 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 border border-[#EAE5DA] rounded-sm shadow-xs flex flex-col md:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#827E77] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by garment title, brand, or SKU..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-xs border border-[#EAE5DA] rounded-sm focus:border-sphere-ink focus:outline-none transition-colors"
          />
        </div>

        {/* Category Filter */}
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 text-xs border border-[#EAE5DA] rounded-sm bg-white text-sphere-ink focus:border-sphere-ink focus:outline-none"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Gender Filter */}
        <select
          value={gender}
          onChange={(e) => {
            setGender(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 text-xs border border-[#EAE5DA] rounded-sm bg-white text-sphere-ink focus:border-sphere-ink focus:outline-none"
        >
          <option value="">All Genders</option>
          <option value="women">Women</option>
          <option value="men">Men</option>
          <option value="unisex">Unisex</option>
          <option value="kids">Kids</option>
        </select>

        {/* Stock Status Filter */}
        <select
          value={stock}
          onChange={(e) => {
            setStock(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 text-xs border border-[#EAE5DA] rounded-sm bg-white text-sphere-ink focus:border-sphere-ink focus:outline-none"
        >
          <option value="">All Stock Levels</option>
          <option value="low_stock">Low Stock (≤ 5)</option>
          <option value="out_of_stock">Out of Stock (0)</option>
        </select>

        {/* Active/Inactive Status Filter */}
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 text-xs border border-[#EAE5DA] rounded-sm bg-white text-sphere-ink focus:border-sphere-ink focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="active">Active in Catalogue</option>
          <option value="inactive">Inactive / Deactivated</option>
        </select>
      </div>

      {/* Product List Table */}
      <div className="bg-white border border-[#EAE5DA] rounded-sm shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12">
            <div className="w-8 h-8 border-2 border-sphere-ink/20 border-t-sphere-ink rounded-full animate-spin mb-3" />
            <p className="text-xs text-[#827E77] tracking-wider uppercase font-semibold">
              Loading Catalog Entries...
            </p>
          </div>
        ) : isError ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-700 flex items-center justify-center mx-auto mb-3 border border-rose-200">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-editorial text-xl text-sphere-ink mb-1">
              Unable to Load Garment Catalogue
            </h3>
            <p className="text-xs text-[#827E77] max-w-sm mx-auto mb-4">
              {error?.message || 'A network error or database readiness issue prevented loading products.'}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#161513] text-[#FDFBF7] text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-[#34302C] transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Request</span>
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Shirt className="w-12 h-12 text-[#C8B293] mx-auto mb-3 opacity-60" />
            <h3 className="font-editorial text-xl text-sphere-ink mb-1">No Garments Found</h3>
            <p className="text-xs text-[#827E77] max-w-sm mx-auto mb-6">
              Adjust your search criteria or create a new garment for the ShopSphere collection.
            </p>
            <Link
              to="/admin/products/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#161513] text-[#FDFBF7] text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-[#34302C]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Garment</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-sphere-ink">
              <thead>
                <tr className="bg-[#FAF8F5] border-b border-[#EAE5DA] text-[10px] uppercase tracking-widest text-[#827E77]">
                  <th className="py-3 px-4 font-semibold">Garment</th>
                  <th className="py-3 px-4 font-semibold">Category</th>
                  <th className="py-3 px-4 font-semibold">Variants / SKUs</th>
                  <th className="py-3 px-4 font-semibold">Price Range</th>
                  <th className="py-3 px-4 font-semibold">Stock Status</th>
                  <th className="py-3 px-4 font-semibold">Visibility</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2EFE9]">
                {products.map((product) => {
                  const variants = Array.isArray(product.variants) ? product.variants : [];
                  const prices = variants.length > 0 ? variants.map((v) => Number(v?.price) || 0) : [0];
                  const minPrice = Math.min(...prices);
                  const maxPrice = Math.max(...prices);
                  const priceDisplay =
                    minPrice === maxPrice
                      ? formatPrice(minPrice)
                      : `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`;

                  const primaryImg =
                    product.images?.find((img) => img?.isPrimary)?.url ||
                    product.images?.[0]?.url ||
                    (typeof product.images?.[0] === 'string' ? product.images[0] : null) ||
                    'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=400&q=80';

                  const categoryName =
                    product.categoryId?.name || product.categoryName || 'Unassigned';

                  const totalStock =
                    product.totalStock ??
                    variants.reduce((acc, v) => acc + (Number(v?.stockQuantity) || 0), 0);

                  const stockStatus =
                    product.stockStatus ||
                    (totalStock === 0
                      ? 'out_of_stock'
                      : variants.some((v) => (v?.stockQuantity || 0) > 0 && (v?.stockQuantity || 0) <= 5)
                      ? 'low_stock'
                      : 'healthy');

                  return (
                    <tr key={product._id} className="hover:bg-[#FCFAF7] transition-colors">
                      {/* Thumbnail & Title */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={primaryImg}
                            alt={product.name || 'Garment'}
                            className="w-12 h-16 object-cover rounded-xs border border-[#EAE5DA] bg-[#F7F4EC]"
                          />
                          <div>
                            <p className="font-semibold text-xs text-sphere-ink">{product.name}</p>
                            <span className="text-[10px] text-[#827E77] uppercase tracking-wider font-mono">
                              {product.brand || 'ShopSphere'} • {product.gender || 'unisex'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 text-[#635E56] font-medium">
                        {categoryName}
                      </td>

                      {/* Variants & SKUs */}
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs font-semibold text-sphere-ink">
                          {variants.length} variant{variants.length !== 1 ? 's' : ''}
                        </span>
                        <div className="text-[10px] text-[#827E77] truncate max-w-[140px]">
                          {variants.map((v) => v?.sku).filter(Boolean).join(', ') || 'No SKUs'}
                        </div>
                      </td>

                      {/* Price Range */}
                      <td className="py-3 px-4 font-medium text-xs text-sphere-ink">
                        {priceDisplay}
                      </td>

                      {/* Stock Status */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-block px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold rounded-xs ${
                              stockStatus === 'out_of_stock'
                                ? 'bg-red-100 text-red-800'
                                : stockStatus === 'low_stock'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {totalStock} in stock
                          </span>
                        </div>
                      </td>

                      {/* Visibility */}
                      <td className="py-3 px-4">
                        {product.isActive ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                            <CheckCircle className="w-3 h-3" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500 font-medium">
                            <XCircle className="w-3 h-3" />
                            <span>Inactive</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/products/${product.slug || product._id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 text-[#827E77] hover:text-sphere-ink transition-colors"
                            title="Preview on Storefront"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                          <Link
                            to={`/admin/products/${product._id}/edit`}
                            className="p-1.5 text-[#827E77] hover:text-sphere-ink transition-colors"
                            title="Edit Garment"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            onClick={() => setProductToDelete(product)}
                            className="p-1.5 text-[#BA4343] hover:text-red-700 transition-colors"
                            title="Deactivate/Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {meta.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-[#EAE5DA] bg-[#FAF8F5] flex items-center justify-between text-xs text-[#827E77]">
            <span>
              Showing {products.length} of {meta.total} garments (Page {meta.page} of {meta.totalPages})
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1.5 border border-[#EAE5DA] rounded-sm disabled:opacity-40 hover:bg-white text-sphere-ink"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                disabled={page >= meta.totalPages}
                onClick={() => setPage(page + 1)}
                className="p-1.5 border border-[#EAE5DA] rounded-sm disabled:opacity-40 hover:bg-white text-sphere-ink"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white max-w-md w-full p-6 rounded-sm border border-[#EAE5DA] shadow-lg animate-fadeIn">
            <div className="flex items-center gap-3 text-sphere-status-error mb-3">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-editorial text-lg text-sphere-ink">Deactivate Garment Creation</h3>
            </div>
            <p className="text-xs text-sphere-charcoal leading-relaxed mb-4">
              Are you sure you want to deactivate or remove{' '}
              <span className="font-semibold text-sphere-ink">"{productToDelete.name}"</span>? It
              will immediately disappear from public customer browsing.
            </p>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xs text-[11px] text-amber-800 leading-relaxed mb-6">
              <strong>Audit & Financial Protection:</strong> If this garment is referenced in existing customer orders or warehouse inventory movements, it will be safely deactivated (marked inactive) rather than hard deleted, preserving full financial history and accounting integrity.
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 border border-[#EAE5DA] text-xs font-semibold uppercase tracking-wider text-[#635E56] hover:bg-[#FAF8F5] rounded-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteProductMutation.isPending}
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-sphere-status-error text-white text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteProductMutation.isPending ? 'Removing...' : 'Confirm Deactivation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
