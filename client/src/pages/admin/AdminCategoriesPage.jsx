import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  FolderTree,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
  RefreshCw,
  Upload,
  Eye,
  EyeOff,
  Loader2,
  ExternalLink,
  Layers,
  Sparkles
} from 'lucide-react';
import {
  useAdminCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useUploadProductImage
} from '../../hooks/useAdmin';

export default function AdminCategoriesPage() {
  const {
    data: categoriesData,
    isLoading,
    isError,
    error,
    refetch
  } = useAdminCategories();

  const createCategoryMutation = useCreateCategory();
  const updateCategoryMutation = useUpdateCategory();
  const deleteCategoryMutation = useDeleteCategory();
  const uploadImageMutation = useUploadProductImage();

  // Search & Status filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals & Feedback
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [modalError, setModalError] = useState('');
  const [notification, setNotification] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Form State
  const [formState, setFormState] = useState({
    name: '',
    slug: '',
    description: '',
    imageUrl: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=800&q=80',
    isActive: true
  });

  // Resilient categories unwrapping
  const categories = useMemo(() => {
    return Array.isArray(categoriesData)
      ? categoriesData
      : Array.isArray(categoriesData?.categories)
      ? categoriesData.categories
      : Array.isArray(categoriesData?.data?.categories)
      ? categoriesData.data.categories
      : [];
  }, [categoriesData]);

  // Derived filtered categories
  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      const matchesSearch =
        !search.trim() ||
        cat.name.toLowerCase().includes(search.toLowerCase().trim()) ||
        cat.slug.toLowerCase().includes(search.toLowerCase().trim()) ||
        (cat.description && cat.description.toLowerCase().includes(search.toLowerCase().trim()));

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && cat.isActive !== false) ||
        (statusFilter === 'inactive' && cat.isActive === false);

      return matchesSearch && matchesStatus;
    });
  }, [categories, search, statusFilter]);

  // Quick statistics
  const stats = useMemo(() => {
    const total = categories.length;
    const active = categories.filter((c) => c.isActive !== false).length;
    const hidden = total - active;
    const totalPieces = categories.reduce((acc, c) => acc + (Number(c.productCount) || 0), 0);
    return { total, active, hidden, totalPieces };
  }, [categories]);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormState({
      name: '',
      slug: '',
      description: '',
      imageUrl: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=800&q=80',
      isActive: true
    });
    setModalError('');
    setModalOpen(true);
  };

  const openEditModal = (cat) => {
    setEditingCategory(cat);
    setFormState({
      name: cat.name || '',
      slug: cat.slug || '',
      description: cat.description || '',
      imageUrl:
        cat.image?.url ||
        'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=800&q=80',
      isActive: cat.isActive !== undefined ? cat.isActive : true
    });
    setModalError('');
    setModalOpen(true);
  };

  // Handle image upload from computer
  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setModalError('Please select a valid image file (JPEG, PNG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setModalError('Image file size must be under 5MB.');
      return;
    }

    setIsUploading(true);
    setModalError('');

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        try {
          const res = await uploadImageMutation.mutateAsync({
            image: reader.result,
            folder: 'shopsphere/categories'
          });
          const uploadedUrl = res.data?.url || res.url || res.data?.image?.url || res.image?.url;
          if (uploadedUrl) {
            setFormState((prev) => ({ ...prev, imageUrl: uploadedUrl }));
          }
        } catch (uploadErr) {
          console.error('Category image upload failed:', uploadErr);
          setModalError(uploadErr.message || 'Image upload failed. You can paste an image URL directly.');
        } finally {
          setIsUploading(false);
        }
      };
    } catch (err) {
      console.error('File read error:', err);
      setIsUploading(false);
    }
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    setModalError('');

    if (!formState.name.trim()) {
      setModalError('Category title is required.');
      return;
    }

    const payload = {
      name: formState.name.trim(),
      slug: formState.slug.trim() || undefined,
      description: formState.description.trim(),
      image: {
        url:
          formState.imageUrl.trim() ||
          'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=800&q=80'
      },
      isActive: formState.isActive
    };

    try {
      if (editingCategory) {
        await updateCategoryMutation.mutateAsync({ id: editingCategory._id, data: payload });
        showNotification('success', `Category "${payload.name}" updated successfully.`);
      } else {
        await createCategoryMutation.mutateAsync(payload);
        showNotification('success', `Category "${payload.name}" created successfully.`);
      }
      setModalOpen(false);
    } catch (err) {
      console.error('Save category error:', err);
      const serverMsg = err.response?.data?.message || err.message;
      setModalError(serverMsg || 'Failed to save category.');
    }
  };

  // Safe activation/deactivation toggle
  const handleToggleStatus = async (cat) => {
    const nextStatus = !cat.isActive;
    try {
      await updateCategoryMutation.mutateAsync({
        id: cat._id,
        data: { isActive: nextStatus }
      });
      showNotification(
        'success',
        `Category "${cat.name}" is now ${nextStatus ? 'active on storefront' : 'hidden from public view'}.`
      );
    } catch (err) {
      console.error('Toggle category status error:', err);
      showNotification('error', err.response?.data?.message || err.message || 'Failed to toggle category status.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;
    try {
      await deleteCategoryMutation.mutateAsync(categoryToDelete._id);
      showNotification('success', `Category "${categoryToDelete.name}" deleted successfully.`);
      setCategoryToDelete(null);
    } catch (err) {
      console.error('Delete category error:', err);
      const serverMsg = err.response?.data?.message || err.message;
      showNotification('error', serverMsg || 'Cannot remove category. Check if active products are assigned to it.');
      setCategoryToDelete(null);
    }
  };

  const isSaving = createCategoryMutation.isPending || updateCategoryMutation.isPending;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header and Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#EAE5DA]">
        <div>
          <h1 className="font-editorial text-3xl font-normal text-sphere-ink tracking-tight">
            Atelier Taxonomy & Categories
          </h1>
          <p className="text-xs text-[#827E77] mt-1 font-sans">
            Curate boutique departments, taxonomy hierarchies, storefront navigation, and catalog filters.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#161513] text-[#FDFBF7] text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-[#34302C] transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>New Category</span>
        </button>
      </div>

      {/* Global Feedback Banner */}
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

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 border border-[#EAE5DA] rounded-sm shadow-xs">
          <span className="text-[10px] uppercase font-mono tracking-wider text-[#827E77] block">Total Departments</span>
          <p className="font-editorial text-2xl text-sphere-ink mt-1">{stats.total}</p>
        </div>
        <div className="bg-white p-4 border border-[#EAE5DA] rounded-sm shadow-xs">
          <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-700 block">Active in Storefront</span>
          <p className="font-editorial text-2xl text-emerald-800 mt-1">{stats.active}</p>
        </div>
        <div className="bg-white p-4 border border-[#EAE5DA] rounded-sm shadow-xs">
          <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 block">Hidden / Archived</span>
          <p className="font-editorial text-2xl text-zinc-700 mt-1">{stats.hidden}</p>
        </div>
        <div className="bg-white p-4 border border-[#EAE5DA] rounded-sm shadow-xs">
          <span className="text-[10px] uppercase font-mono tracking-wider text-[#827E77] block">Categorized Pieces</span>
          <p className="font-editorial text-2xl text-sphere-ink mt-1">{stats.totalPieces}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 border border-[#EAE5DA] rounded-sm shadow-xs flex flex-col md:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#827E77] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search categories by name, slug, or narrative profile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-[#EAE5DA] rounded-sm focus:border-sphere-ink focus:outline-none transition-colors"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-xs border border-[#EAE5DA] rounded-sm bg-white text-sphere-ink focus:border-sphere-ink focus:outline-none"
        >
          <option value="all">All Statuses ({categories.length})</option>
          <option value="active">Active Only ({stats.active})</option>
          <option value="inactive">Hidden Only ({stats.hidden})</option>
        </select>
      </div>

      {/* Categories Table */}
      <div className="bg-white border border-[#EAE5DA] rounded-sm shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12">
            <div className="w-8 h-8 border-2 border-sphere-ink/20 border-t-sphere-ink rounded-full animate-spin mb-3" />
            <p className="text-xs text-[#827E77] uppercase font-semibold">Loading Taxonomy Departments...</p>
          </div>
        ) : isError ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-700 flex items-center justify-center mx-auto mb-3 border border-rose-200">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-editorial text-xl text-sphere-ink mb-1">Unable to Load Categories</h3>
            <p className="text-xs text-[#827E77] max-w-sm mx-auto mb-4">
              {error?.message || 'A network error or database readiness issue prevented loading categories.'}
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
        ) : filteredCategories.length === 0 ? (
          <div className="text-center py-16 px-4">
            <FolderTree className="w-12 h-12 text-[#C8B293] mx-auto mb-3 opacity-60" />
            <h3 className="font-editorial text-xl text-sphere-ink mb-1">
              {categories.length === 0 ? 'No Categories Found' : 'No Matching Categories'}
            </h3>
            <p className="text-xs text-[#827E77] max-w-sm mx-auto mb-6">
              {categories.length === 0
                ? 'Create your first atelier collection category to start organizing garments.'
                : 'Adjust your search query or filter selection to discover taxonomy departments.'}
            </p>
            {categories.length === 0 ? (
              <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#161513] text-[#FDFBF7] text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-[#34302C]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add First Category</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setSearch('');
                  setStatusFilter('all');
                }}
                className="px-4 py-2 border border-[#EAE5DA] text-xs font-semibold uppercase tracking-wider text-[#635E56] hover:bg-white rounded-sm"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-sphere-ink">
              <thead>
                <tr className="bg-[#FAF8F5] border-b border-[#EAE5DA] text-[10px] uppercase tracking-widest text-[#827E77]">
                  <th className="py-3 px-4 font-semibold">Department</th>
                  <th className="py-3 px-4 font-semibold">Storefront Slug</th>
                  <th className="py-3 px-4 font-semibold">Editorial Narrative</th>
                  <th className="py-3 px-4 font-semibold">Catalogue Count</th>
                  <th className="py-3 px-4 font-semibold">Visibility</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2EFE9]">
                {filteredCategories.map((cat) => (
                  <tr key={cat._id} className="hover:bg-[#FCFAF7] transition-colors">
                    {/* Image & Title */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            cat.image?.url ||
                            'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=400&q=80'
                          }
                          alt={cat.name}
                          className="w-10 h-10 object-cover rounded-xs border border-[#EAE5DA] bg-[#F7F4EC]"
                        />
                        <div>
                          <span className="font-semibold text-xs text-sphere-ink block">{cat.name}</span>
                          <span className="text-[10px] text-[#827E77] font-mono">ID: {cat._id.slice(-6)}</span>
                        </div>
                      </div>
                    </td>

                    {/* Slug */}
                    <td className="py-3 px-4 font-mono text-[11px] text-[#635E56]">
                      /{cat.slug}
                    </td>

                    {/* Description */}
                    <td className="py-3 px-4 text-[#827E77] max-w-xs truncate">
                      {cat.description || 'No editorial profile provided.'}
                    </td>

                    {/* Product count */}
                    <td className="py-3 px-4">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xs bg-[#FAF8F5] border border-[#EAE5DA]">
                        <Layers className="w-3 h-3 text-[#827E77]" />
                        <span className="font-mono font-semibold text-xs text-sphere-ink">
                          {cat.productCount !== undefined ? cat.productCount : 0}
                        </span>
                        <span className="text-[10px] text-[#827E77]">pieces</span>
                      </div>
                    </td>

                    {/* Status & Safe Toggle */}
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(cat)}
                        className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-xs transition-colors ${
                          cat.isActive !== false
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                        }`}
                        title={cat.isActive !== false ? 'Click to hide from storefront' : 'Click to make active on storefront'}
                      >
                        {cat.isActive !== false ? (
                          <>
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 text-zinc-500" />
                            <span>Hidden</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1 sm:gap-2">
                        <Link
                          to={`/category/${cat.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 text-[#827E77] hover:text-sphere-ink transition-colors"
                          title="Preview Storefront Collection"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => openEditModal(cat)}
                          className="p-1.5 text-[#827E77] hover:text-sphere-ink transition-colors"
                          title="Edit Category Details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setCategoryToDelete(cat)}
                          className="p-1.5 text-[#BA4343] hover:text-red-700 transition-colors"
                          title="Delete Category"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create / Edit Category */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white max-w-lg w-full p-6 rounded-sm border border-[#EAE5DA] shadow-lg animate-fadeIn space-y-4">
            <div className="flex items-center justify-between border-b border-[#EAE5DA] pb-2">
              <h3 className="font-editorial text-xl text-sphere-ink">
                {editingCategory ? `Refine Department: ${editingCategory.name}` : 'New Collection Department'}
              </h3>
              <span className="text-[10px] text-[#827E77] uppercase font-mono">
                {editingCategory ? 'Edit Mode' : 'Creation Mode'}
              </span>
            </div>

            {modalError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-sm text-xs text-red-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleModalSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold uppercase tracking-wider text-[#635E56] mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tailored Outerwear"
                  value={formState.name}
                  onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                  className="w-full px-3 py-2 border border-[#EAE5DA] rounded-sm focus:border-sphere-ink focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-[#635E56] mb-1">
                  Custom Slug (Optional)
                </label>
                <input
                  type="text"
                  placeholder="outerwear (leave blank to derive automatically)"
                  value={formState.slug}
                  onChange={(e) => setFormState({ ...formState, slug: e.target.value })}
                  className="w-full px-3 py-2 border border-[#EAE5DA] rounded-sm focus:border-sphere-ink focus:outline-none font-mono"
                />
                <span className="text-[10px] text-[#827E77] mt-0.5 block">
                  Storefront URL path: /category/{formState.slug ? formState.slug.toLowerCase().replace(/\s+/g, '-') : (formState.name ? formState.name.toLowerCase().replace(/\s+/g, '-') : 'slug')}
                </span>
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-[#635E56] mb-1">
                  Editorial Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Sculptural coats, double-faced wool, and water-repellent gabardine..."
                  value={formState.description}
                  onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                  className="w-full px-3 py-2 border border-[#EAE5DA] rounded-sm focus:border-sphere-ink focus:outline-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-[#635E56] mb-1">
                  Cover Image
                </label>
                <div className="flex gap-3 items-center">
                  <img
                    src={formState.imageUrl || 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=400&q=80'}
                    alt="Preview"
                    className="w-14 h-14 object-cover rounded-xs border border-[#EAE5DA] bg-[#F7F4EC] shrink-0"
                  />
                  <div className="flex-1 space-y-2">
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/..."
                      value={formState.imageUrl}
                      onChange={(e) => setFormState({ ...formState, imageUrl: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-[#EAE5DA] rounded-sm focus:border-sphere-ink focus:outline-none font-mono"
                    />
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1 border border-[#EAE5DA] text-[11px] font-semibold uppercase tracking-wider text-[#635E56] hover:bg-[#FAF8F5] rounded-xs transition-colors">
                      <Upload className="w-3 h-3" />
                      <span>{isUploading ? 'Uploading...' : 'Upload Image File'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isUploading}
                        onChange={handleImageFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[#EAE5DA]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formState.isActive}
                    onChange={(e) => setFormState({ ...formState, isActive: e.target.checked })}
                    className="rounded border-[#EAE5DA] text-sphere-ink focus:ring-sphere-sand"
                  />
                  <span className="font-medium text-sphere-ink">
                    Active & visible in Storefront Sidebar and Navigation
                  </span>
                </label>
                <span className="text-[10px] text-[#827E77] ml-6 block">
                  Unchecking will hide this category from customers while preserving all associated garments in the catalogue.
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#EAE5DA]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-[#EAE5DA] text-xs font-semibold uppercase tracking-wider text-[#635E56] hover:bg-[#FAF8F5] rounded-sm"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={isSaving || isUploading}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#161513] text-[#FDFBF7] text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-[#34302C] transition-colors disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : editingCategory ? (
                    'Update Category'
                  ) : (
                    'Publish Category'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation & Product Protection Modal */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white max-w-md w-full p-6 rounded-sm border border-[#EAE5DA] shadow-lg animate-fadeIn">
            <div className="flex items-center gap-3 text-sphere-status-error mb-3">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-editorial text-lg text-sphere-ink">Category Deletion</h3>
            </div>

            <p className="text-xs text-sphere-charcoal leading-relaxed mb-4">
              Are you sure you want to remove the category department{' '}
              <span className="font-semibold text-sphere-ink">"{categoryToDelete.name}"</span>?
            </p>

            {categoryToDelete.productCount > 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xs text-[11px] text-amber-800 leading-relaxed mb-6 space-y-2">
                <p className="font-semibold flex items-center gap-1.5 text-amber-900">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Deletion Blocked — Associated Garments Protected</span>
                </p>
                <p>
                  This category is currently linked to{' '}
                  <span className="font-bold">{categoryToDelete.productCount} active piece(s)</span>.
                  To protect catalogue integrity and prevent broken storefront references, categories with
                  existing garments cannot be permanently deleted.
                </p>
                <p className="text-[10px] text-amber-700">
                  Recommendation: If you wish to hide this category from customers, please deactivate it instead.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xs text-[11px] text-zinc-700 leading-relaxed mb-6">
                This category has <strong>0 associated garments</strong> and can be safely removed permanently.
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="px-4 py-2 border border-[#EAE5DA] text-xs font-semibold uppercase tracking-wider text-[#635E56] hover:bg-[#FAF8F5] rounded-sm"
              >
                Cancel
              </button>

              {categoryToDelete.productCount > 0 ? (
                <button
                  type="button"
                  onClick={async () => {
                    await handleToggleStatus({ ...categoryToDelete, isActive: true }); // toggle to false
                    setCategoryToDelete(null);
                  }}
                  className="px-4 py-2 bg-[#161513] text-[#FDFBF7] text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-[#34302C] transition-colors"
                >
                  Deactivate Category Instead
                </button>
              ) : (
                <button
                  type="button"
                  disabled={deleteCategoryMutation.isPending}
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 bg-sphere-status-error text-white text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {deleteCategoryMutation.isPending ? 'Removing...' : 'Confirm Deletion'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
