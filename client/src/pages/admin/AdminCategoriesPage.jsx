import React, { useState } from 'react';
import {
  Plus,
  FolderTree,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ExternalLink
} from 'lucide-react';
import {
  useAdminCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory
} from '../../hooks/useAdmin';

export default function AdminCategoriesPage() {
  const { data: categories = [], isLoading, isError, refetch } = useAdminCategories();
  const createCategoryMutation = useCreateCategory();
  const updateCategoryMutation = useUpdateCategory();
  const deleteCategoryMutation = useDeleteCategory();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [modalError, setModalError] = useState('');

  const [formState, setFormState] = useState({
    name: '',
    slug: '',
    description: '',
    imageUrl: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=800&q=80',
    isActive: true
  });

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
      imageUrl: cat.image?.url || 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=800&q=80',
      isActive: cat.isActive !== undefined ? cat.isActive : true
    });
    setModalError('');
    setModalOpen(true);
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
        url: formState.imageUrl.trim() || 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=800&q=80'
      },
      isActive: formState.isActive
    };

    try {
      if (editingCategory) {
        await updateCategoryMutation.mutateAsync({ id: editingCategory._id, data: payload });
      } else {
        await createCategoryMutation.mutateAsync(payload);
      }
      setModalOpen(false);
    } catch (err) {
      console.error('Save category error:', err);
      setModalError(err.message || 'Failed to save category.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;
    try {
      await deleteCategoryMutation.mutateAsync(categoryToDelete._id);
      setCategoryToDelete(null);
    } catch (err) {
      console.error('Delete category error:', err);
      alert(err.message || 'Cannot remove category. Verify if active products are assigned to it.');
      setCategoryToDelete(null);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header and Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#EAE5DA]">
        <div>
          <h1 className="font-editorial text-3xl font-normal text-sphere-ink tracking-tight">
            Atelier Taxonomy & Categories
          </h1>
          <p className="text-xs text-[#827E77] mt-1 font-sans">
            Curate boutique departments, taxonomy hierarchies, and collection umbrellas.
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

      {/* Categories Table */}
      <div className="bg-white border border-[#EAE5DA] rounded-sm shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12">
            <div className="w-8 h-8 border-2 border-sphere-ink/20 border-t-sphere-ink rounded-full animate-spin mb-3" />
            <p className="text-xs text-[#827E77] uppercase font-semibold">Loading Taxonomy...</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-16 px-4">
            <FolderTree className="w-12 h-12 text-[#C8B293] mx-auto mb-3 opacity-60" />
            <h3 className="font-editorial text-xl text-sphere-ink mb-1">No Categories Found</h3>
            <p className="text-xs text-[#827E77] max-w-sm mx-auto mb-6">
              Create your first atelier collection category to start organizing garments.
            </p>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#161513] text-[#FDFBF7] text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-[#34302C]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Category</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-sphere-ink">
              <thead>
                <tr className="bg-[#FAF8F5] border-b border-[#EAE5DA] text-[10px] uppercase tracking-widest text-[#827E77]">
                  <th className="py-3 px-4 font-semibold">Category</th>
                  <th className="py-3 px-4 font-semibold">Slug</th>
                  <th className="py-3 px-4 font-semibold">Narrative</th>
                  <th className="py-3 px-4 font-semibold">Garments</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2EFE9]">
                {categories.map((cat) => (
                  <tr key={cat._id} className="hover:bg-[#FCFAF7] transition-colors">
                    {/* Image & Title */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={cat.image?.url || 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=400&q=80'}
                          alt={cat.name}
                          className="w-10 h-10 object-cover rounded-xs border border-[#EAE5DA] bg-[#F7F4EC]"
                        />
                        <span className="font-semibold text-xs text-sphere-ink">{cat.name}</span>
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
                      <span className="font-mono font-medium text-xs text-sphere-ink">
                        {cat.productCount !== undefined ? cat.productCount : '—'} pieces
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      {cat.isActive !== false ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                          <CheckCircle className="w-3 h-3" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500 font-medium">
                          <XCircle className="w-3 h-3" />
                          <span>Hidden</span>
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(cat)}
                          className="p-1.5 text-[#827E77] hover:text-sphere-ink transition-colors"
                          title="Edit Category"
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
            <h3 className="font-editorial text-xl text-sphere-ink border-b border-[#EAE5DA] pb-2">
              {editingCategory ? 'Update Category Taxonomy' : 'Create New Collection Department'}
            </h3>

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
                  placeholder="outerwear"
                  value={formState.slug}
                  onChange={(e) => setFormState({ ...formState, slug: e.target.value })}
                  className="w-full px-3 py-2 border border-[#EAE5DA] rounded-sm focus:border-sphere-ink focus:outline-none font-mono"
                />
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
                  Cover Image URL
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={formState.imageUrl}
                  onChange={(e) => setFormState({ ...formState, imageUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-[#EAE5DA] rounded-sm focus:border-sphere-ink focus:outline-none font-mono"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={formState.isActive}
                  onChange={(e) => setFormState({ ...formState, isActive: e.target.checked })}
                  className="rounded border-[#EAE5DA] text-sphere-ink focus:ring-sphere-sand"
                />
                <span className="font-medium text-sphere-ink">
                  Show in Public Navigation & Storefront
                </span>
              </label>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#EAE5DA]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-[#EAE5DA] text-xs font-semibold uppercase tracking-wider text-[#635E56] hover:bg-[#FAF8F5] rounded-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
                  className="px-5 py-2 bg-[#161513] text-[#FDFBF7] text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-[#34302C] transition-colors disabled:opacity-50"
                >
                  {editingCategory ? 'Update Category' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white max-w-md w-full p-6 rounded-sm border border-[#EAE5DA] shadow-lg animate-fadeIn">
            <div className="flex items-center gap-3 text-sphere-status-error mb-3">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-editorial text-lg text-sphere-ink">Remove Category Department</h3>
            </div>
            <p className="text-xs text-sphere-charcoal leading-relaxed mb-6">
              Are you sure you want to delete <span className="font-semibold text-sphere-ink">"{categoryToDelete.name}"</span>?
              {categoryToDelete.productCount > 0 && (
                <span className="block mt-2 font-medium text-amber-800">
                  Note: This category contains {categoryToDelete.productCount} active garments. You must reassign or remove them before deleting.
                </span>
              )}
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="px-4 py-2 border border-[#EAE5DA] text-xs font-semibold uppercase tracking-wider text-[#635E56] hover:bg-[#FAF8F5] rounded-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteCategoryMutation.isPending}
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-sphere-status-error text-white text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteCategoryMutation.isPending ? 'Removing...' : 'Confirm Deletion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
