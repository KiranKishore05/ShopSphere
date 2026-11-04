import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Upload,
  Image as ImageIcon,
  CheckCircle,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import {
  useAdminProduct,
  useAdminCategories,
  useCreateProduct,
  useUpdateProduct,
  useUploadProductImage
} from '../../hooks/useAdmin';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '28', '30', '32', '34', '36', '38', 'One Size'];

export default function AdminProductFormPage() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const { data: categoriesData } = useAdminCategories();
  const { data: productData, isLoading: isLoadingProduct } = useAdminProduct(id);

  const createProductMutation = useCreateProduct();
  const updateProductMutation = useUpdateProduct();
  const uploadImageMutation = useUploadProductImage();

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    categoryId: '',
    brand: 'ShopSphere Atelier',
    gender: 'women',
    description: '',
    tags: '',
    isFeatured: false,
    isActive: true
  });

  const [images, setImages] = useState([
    {
      url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=80',
      public_id: '',
      altText: 'Editorial apparel front perspective',
      isPrimary: true
    }
  ]);

  const [imageUrlInput, setImageUrlInput] = useState('');
  const [variants, setVariants] = useState([
    {
      sku: 'SPH-NEW-BLK-S',
      size: 'S',
      colorName: 'Noir Black',
      colorHex: '#161513',
      price: 4500,
      compareAtPrice: 5500,
      stockQuantity: 10
    }
  ]);

  const [formError, setFormError] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Populate data when editing
  useEffect(() => {
    if (isEditing && productData) {
      setFormData({
        name: productData.name || '',
        slug: productData.slug || '',
        categoryId: productData.categoryId?._id || productData.categoryId || '',
        brand: productData.brand || 'ShopSphere Atelier',
        gender: productData.gender || 'women',
        description: productData.description || '',
        tags: (productData.tags || []).join(', '),
        isFeatured: Boolean(productData.isFeatured),
        isActive: productData.isActive !== undefined ? Boolean(productData.isActive) : true
      });

      if (productData.images && productData.images.length > 0) {
        setImages(productData.images);
      }

      if (productData.variants && productData.variants.length > 0) {
        setVariants(
          productData.variants.map((v) => ({
            sku: v.sku,
            size: v.size,
            colorName: v.color?.name || 'Noir',
            colorHex: v.color?.hexCode || '#000000',
            price: v.price,
            compareAtPrice: v.compareAtPrice || '',
            stockQuantity: v.stockQuantity
          }))
        );
      }
    }
  }, [isEditing, productData]);

  // Set default category once categories load
  useEffect(() => {
    if (!formData.categoryId && categoriesData && categoriesData.length > 0) {
      setFormData((prev) => ({ ...prev, categoryId: categoriesData[0]._id }));
    }
  }, [categoriesData, formData.categoryId]);

  // Handle image upload from computer file input
  const handleFileImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormError('Please select a valid image file (JPEG, PNG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormError('Image file size must be under 5MB.');
      return;
    }

    setIsUploading(true);
    setFormError('');

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        try {
          const res = await uploadImageMutation.mutateAsync({
            image: reader.result,
            folder: 'shopsphere/products'
          });

          const uploadedImg = res.data?.image || res.image || res;
          setImages((prev) => [
            ...prev,
            {
              url: uploadedImg.url,
              public_id: uploadedImg.public_id || '',
              altText: file.name.replace(/\.[^/.]+$/, ''),
              isPrimary: prev.length === 0
            }
          ]);
        } catch (uploadErr) {
          console.error('Image upload failed:', uploadErr);
          setFormError(uploadErr.message || 'Image upload failed. You can paste an image URL directly.');
        } finally {
          setIsUploading(false);
        }
      };
    } catch (err) {
      console.error('File read error:', err);
      setIsUploading(false);
    }
  };

  const handleAddImageUrl = () => {
    if (!imageUrlInput.trim()) return;
    try {
      new URL(imageUrlInput.trim());
      setImages((prev) => [
        ...prev,
        {
          url: imageUrlInput.trim(),
          public_id: '',
          altText: formData.name || 'Garment image',
          isPrimary: prev.length === 0
        }
      ]);
      setImageUrlInput('');
    } catch {
      setFormError('Please enter a valid HTTP/HTTPS image URL.');
    }
  };

  const handleSetPrimaryImage = (index) => {
    setImages((prev) =>
      prev.map((img, idx) => ({
        ...img,
        isPrimary: idx === index
      }))
    );
  };

  const handleRemoveImage = (index) => {
    setImages((prev) => {
      const filtered = prev.filter((_, idx) => idx !== index);
      if (filtered.length > 0 && !filtered.some((img) => img.isPrimary)) {
        filtered[0].isPrimary = true;
      }
      return filtered;
    });
  };

  // Variant Management
  const handleAddVariant = () => {
    const nextSku = `SPH-${Date.now().toString().slice(-4)}-${variants.length + 1}`;
    setVariants((prev) => [
      ...prev,
      {
        sku: nextSku,
        size: 'M',
        colorName: 'Classic Charcoal',
        colorHex: '#34302C',
        price: 4900,
        compareAtPrice: '',
        stockQuantity: 15
      }
    ]);
  };

  const handleRemoveVariant = (index) => {
    if (variants.length <= 1) {
      setFormError('Every garment must possess at least one variant.');
      return;
    }
    setVariants((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleVariantChange = (index, field, value) => {
    setVariants((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    // Validations
    if (!formData.name.trim()) {
      setFormError('Product title is required.');
      return;
    }

    if (!formData.description.trim() || formData.description.length < 10) {
      setFormError('Description must be at least 10 characters.');
      return;
    }

    if (!formData.categoryId) {
      setFormError('Please select a garment category.');
      return;
    }

    if (images.length === 0) {
      setFormError('At least one product image is required.');
      return;
    }

    if (variants.length === 0) {
      setFormError('At least one variant is required.');
      return;
    }

    // Check duplicate SKUs in local list
    const skus = variants.map((v) => v.sku.trim().toUpperCase());
    const uniqueSkus = new Set(skus);
    if (uniqueSkus.size !== skus.length) {
      setFormError('Duplicate SKUs detected within the variant list. Each variant SKU must be distinct.');
      return;
    }

    // Format payload
    const payload = {
      name: formData.name.trim(),
      slug: formData.slug.trim() || undefined,
      categoryId: formData.categoryId,
      brand: formData.brand.trim(),
      gender: formData.gender,
      description: formData.description.trim(),
      tags: formData.tags
        ? formData.tags
            .split(',')
            .map((t) => t.trim().toLowerCase())
            .filter(Boolean)
        : [],
      images: images.map((img) => ({
        url: img.url,
        public_id: img.public_id || '',
        altText: img.altText || formData.name,
        isPrimary: Boolean(img.isPrimary)
      })),
      variants: variants.map((v) => ({
        sku: v.sku.trim().toUpperCase(),
        size: v.size,
        color: {
          name: v.colorName.trim(),
          hexCode: v.colorHex.trim()
        },
        price: Number(v.price),
        compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : null,
        stockQuantity: Number(v.stockQuantity),
        isActive: true
      })),
      isFeatured: formData.isFeatured,
      isActive: formData.isActive
    };

    try {
      if (isEditing) {
        await updateProductMutation.mutateAsync({ id, data: payload });
      } else {
        await createProductMutation.mutateAsync(payload);
      }
      navigate('/admin/products');
    } catch (err) {
      console.error('Save product error:', err);
      setFormError(err.message || 'Failed to save product in atelier catalog.');
    }
  };

  if (isEditing && isLoadingProduct) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-sphere-ink/20 border-t-sphere-ink rounded-full animate-spin mb-3" />
        <p className="text-xs text-[#827E77] uppercase font-semibold">Retrieving Garment Blueprint...</p>
      </div>
    );
  }

  const isSaving = createProductMutation.isPending || updateProductMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl mx-auto pb-16 animate-fadeIn">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between pb-4 border-b border-[#EAE5DA]">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/products"
            className="p-1.5 border border-[#EAE5DA] rounded-sm text-[#635E56] hover:text-sphere-ink hover:bg-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-editorial text-2xl font-normal text-sphere-ink">
              {isEditing ? `Refine Garment: ${formData.name || 'Creation'}` : 'New Atelier Creation'}
            </h1>
            <p className="text-xs text-[#827E77] font-sans">
              Define silhouettes, textile specifications, imagery, and variant sizing.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/admin/products"
            className="px-4 py-2 border border-[#EAE5DA] text-xs font-semibold uppercase tracking-wider text-[#635E56] hover:bg-white rounded-sm"
          >
            Discard
          </Link>
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2 bg-[#161513] text-[#FDFBF7] text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-[#34302C] transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Saving Blueprint...' : isEditing ? 'Update Garment' : 'Publish to Atelier'}
          </button>
        </div>
      </div>

      {/* Global Error Banner */}
      {formError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-sm text-xs text-red-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* Grid: Left Column (Basics & Media) + Right Column (Meta & Toggles) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Main Attributes */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Core Details */}
          <div className="bg-white p-6 border border-[#EAE5DA] rounded-sm shadow-xs space-y-4">
            <h2 className="font-editorial text-lg text-sphere-ink border-b border-[#EAE5DA] pb-2">
              Identity & Narrative
            </h2>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#635E56] mb-1">
                Garment Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Silk Cashmere Trench Coat"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-[#EAE5DA] rounded-sm focus:border-sphere-ink focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#635E56] mb-1">
                  Brand / Maison *
                </label>
                <input
                  type="text"
                  required
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-[#EAE5DA] rounded-sm focus:border-sphere-ink focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#635E56] mb-1">
                  Custom Slug (Optional)
                </label>
                <input
                  type="text"
                  placeholder="auto-derived-if-blank"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-[#EAE5DA] rounded-sm focus:border-sphere-ink focus:outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#635E56] mb-1">
                Description & Textile Profile *
              </label>
              <textarea
                required
                rows={4}
                placeholder="Detail the drape, weave composition, tailoring, and occasion..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-[#EAE5DA] rounded-sm focus:border-sphere-ink focus:outline-none leading-relaxed"
              />
            </div>
          </div>

          {/* Section 2: Visual Portfolio (Images) */}
          <div className="bg-white p-6 border border-[#EAE5DA] rounded-sm shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#EAE5DA] pb-2">
              <h2 className="font-editorial text-lg text-sphere-ink">Visual Portfolio</h2>
              <span className="text-[11px] text-[#827E77] font-mono">
                {images.length} imagery asset{images.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Existing Images Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className={`relative group rounded-sm overflow-hidden border ${
                    img.isPrimary ? 'border-sphere-sand ring-1 ring-sphere-sand' : 'border-[#EAE5DA]'
                  } bg-[#F7F4EC]`}
                >
                  <img
                    src={img.url}
                    alt={img.altText || 'Garment preview'}
                    className="w-full h-36 object-cover"
                  />
                  {img.isPrimary && (
                    <span className="absolute top-1.5 left-1.5 bg-[#161513] text-[#FDFBF7] text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-xs font-semibold">
                      Primary
                    </span>
                  )}

                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-2 text-white">
                    {!img.isPrimary && (
                      <button
                        type="button"
                        onClick={() => handleSetPrimaryImage(idx)}
                        className="px-2 py-1 bg-white/90 text-[#161513] text-[10px] font-semibold uppercase tracking-wider rounded-xs hover:bg-white"
                      >
                        Make Primary
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="px-2 py-1 bg-red-600/90 text-white text-[10px] font-semibold uppercase tracking-wider rounded-xs hover:bg-red-600 flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Upload or Add Image URL Controls */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2 border border-[#161513] text-xs font-semibold uppercase tracking-wider text-sphere-ink hover:bg-[#FAF8F5] rounded-sm transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>{isUploading ? 'Uploading...' : 'Upload Image File'}</span>
                <input
                  type="file"
                  accept="image/*"
                  disabled={isUploading}
                  onChange={handleFileImageUpload}
                  className="hidden"
                />
              </label>

              <div className="flex-1 flex gap-2">
                <input
                  type="url"
                  placeholder="Or paste external image URL (https://...)"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs border border-[#EAE5DA] rounded-sm focus:border-sphere-ink focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  className="px-3 py-2 bg-[#F2EFE9] text-sphere-ink text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-[#E8E4DC]"
                >
                  Add URL
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Categorization & Status */}
        <div className="space-y-6">
          <div className="bg-white p-6 border border-[#EAE5DA] rounded-sm shadow-xs space-y-4">
            <h2 className="font-editorial text-lg text-sphere-ink border-b border-[#EAE5DA] pb-2">
              Classification
            </h2>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#635E56] mb-1">
                Category *
              </label>
              <select
                required
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-[#EAE5DA] rounded-sm bg-white text-sphere-ink focus:border-sphere-ink focus:outline-none"
              >
                <option value="">Select Category</option>
                {categoriesData?.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#635E56] mb-1">
                Gender Classification *
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-[#EAE5DA] rounded-sm bg-white text-sphere-ink focus:border-sphere-ink focus:outline-none"
              >
                <option value="women">Women's Collection</option>
                <option value="men">Men's Collection</option>
                <option value="unisex">Unisex Line</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#635E56] mb-1">
                Editorial Tags (comma-separated)
              </label>
              <input
                type="text"
                placeholder="linen, runway, spring-summer, outerwear"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-[#EAE5DA] rounded-sm focus:border-sphere-ink focus:outline-none"
              />
            </div>
          </div>

          <div className="bg-white p-6 border border-[#EAE5DA] rounded-sm shadow-xs space-y-3">
            <h2 className="font-editorial text-lg text-sphere-ink border-b border-[#EAE5DA] pb-2">
              Visibility & Promotion
            </h2>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded border-[#EAE5DA] text-sphere-ink focus:ring-sphere-sand"
              />
              <span className="text-xs font-medium text-sphere-ink">
                Active in Storefront Catalogue
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isFeatured}
                onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                className="rounded border-[#EAE5DA] text-sphere-ink focus:ring-sphere-sand"
              />
              <span className="text-xs font-medium text-sphere-ink">
                Feature on Atelier Homepage Spotlight
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Section 3: Variant Matrix (Full Width) */}
      <div className="bg-white p-6 border border-[#EAE5DA] rounded-sm shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#EAE5DA] pb-3">
          <div>
            <h2 className="font-editorial text-xl text-sphere-ink">Sizing & Variant Matrix</h2>
            <p className="text-[11px] text-[#827E77] uppercase tracking-wider font-sans">
              Set SKUs, color swatches, commercial pricing, and warehouse stock
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddVariant}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#161513] text-[#FDFBF7] text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-[#34302C]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Variant SKU</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-sphere-ink">
            <thead>
              <tr className="border-b border-[#EAE5DA] bg-[#FAF8F5] text-[10px] uppercase tracking-widest text-[#827E77]">
                <th className="py-2.5 px-3 font-semibold">SKU Code *</th>
                <th className="py-2.5 px-3 font-semibold">Size</th>
                <th className="py-2.5 px-3 font-semibold">Color Name</th>
                <th className="py-2.5 px-3 font-semibold">Color Hex</th>
                <th className="py-2.5 px-3 font-semibold">Price (₹) *</th>
                <th className="py-2.5 px-3 font-semibold">Compare Price (₹)</th>
                <th className="py-2.5 px-3 font-semibold">Stock Quantity *</th>
                <th className="py-2.5 px-3 font-semibold text-right">Remove</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2EFE9]">
              {variants.map((v, idx) => (
                <tr key={idx} className="hover:bg-[#FCFAF7]">
                  {/* SKU */}
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      required
                      value={v.sku}
                      onChange={(e) => handleVariantChange(idx, 'sku', e.target.value.toUpperCase())}
                      className="w-32 px-2 py-1 text-xs border border-[#EAE5DA] rounded-sm font-mono font-medium focus:border-sphere-ink focus:outline-none uppercase"
                    />
                  </td>

                  {/* Size */}
                  <td className="py-2 px-3">
                    <select
                      value={v.size}
                      onChange={(e) => handleVariantChange(idx, 'size', e.target.value)}
                      className="px-2 py-1 text-xs border border-[#EAE5DA] rounded-sm bg-white focus:border-sphere-ink focus:outline-none"
                    >
                      {SIZES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Color Name */}
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      required
                      value={v.colorName}
                      onChange={(e) => handleVariantChange(idx, 'colorName', e.target.value)}
                      className="w-28 px-2 py-1 text-xs border border-[#EAE5DA] rounded-sm focus:border-sphere-ink focus:outline-none"
                    />
                  </td>

                  {/* Color Hex */}
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={v.colorHex}
                        onChange={(e) => handleVariantChange(idx, 'colorHex', e.target.value)}
                        className="w-6 h-6 p-0 border border-[#EAE5DA] rounded-xs cursor-pointer"
                      />
                      <input
                        type="text"
                        value={v.colorHex}
                        onChange={(e) => handleVariantChange(idx, 'colorHex', e.target.value)}
                        className="w-18 px-1.5 py-1 text-[11px] font-mono border border-[#EAE5DA] rounded-sm focus:border-sphere-ink focus:outline-none"
                      />
                    </div>
                  </td>

                  {/* Price */}
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      required
                      min={0}
                      value={v.price}
                      onChange={(e) => handleVariantChange(idx, 'price', e.target.value)}
                      className="w-24 px-2 py-1 text-xs border border-[#EAE5DA] rounded-sm font-medium focus:border-sphere-ink focus:outline-none"
                    />
                  </td>

                  {/* Compare Price */}
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      min={0}
                      placeholder="Optional"
                      value={v.compareAtPrice}
                      onChange={(e) => handleVariantChange(idx, 'compareAtPrice', e.target.value)}
                      className="w-24 px-2 py-1 text-xs border border-[#EAE5DA] rounded-sm focus:border-sphere-ink focus:outline-none"
                    />
                  </td>

                  {/* Stock */}
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      required
                      min={0}
                      value={v.stockQuantity}
                      onChange={(e) => handleVariantChange(idx, 'stockQuantity', e.target.value)}
                      className="w-20 px-2 py-1 text-xs border border-[#EAE5DA] rounded-sm font-medium focus:border-sphere-ink focus:outline-none"
                    />
                  </td>

                  {/* Remove */}
                  <td className="py-2 px-3 text-right">
                    <button
                      type="button"
                      disabled={variants.length <= 1}
                      onClick={() => handleRemoveVariant(idx)}
                      className="p-1 text-[#BA4343] hover:text-red-700 disabled:opacity-30"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </form>
  );
}
