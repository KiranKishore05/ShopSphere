import React, { useState } from 'react';
import { Mail, Phone, MapPin, Clock, Send, CheckCircle2, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import SEO from '../components/common/SEO';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    category: 'order_status',
    orderNumber: '',
    message: ''
  });

  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  const categories = [
    { value: 'order_status', label: 'Order Tracking & Delivery' },
    { value: 'sizing_fit', label: 'Sizing & Style Advice' },
    { value: 'returns_exchange', label: 'Returns & Size Exchanges' },
    { value: 'product_inquiry', label: 'Product & Fabric Details' },
    { value: 'general', label: 'General Atelier Inquiry' }
  ];

  const faqs = [
    {
      q: 'What are your delivery timelines across India?',
      a: 'We offer express delivery across major metro cities within 2 to 3 business days. For non-metro regions and tier-2/3 cities, standard delivery takes 4 to 5 business days. Once dispatched, you receive a real-time tracking link via email.'
    },
    {
      q: 'How do I initiate a return or size exchange?',
      a: 'You can initiate an exchange or return directly from your Account > Orders dashboard within 7 days of delivery. Our courier partners provide complimentary doorstep reverse pickup with zero hidden charges.'
    },
    {
      q: 'Are online payments secure on ShopSphere?',
      a: 'Absolutely. All transactions are securely routed through Razorpay using industry-standard 256-bit SSL encryption. We comply fully with RBI tokenization guidelines and never store your sensitive CVV or card details.'
    },
    {
      q: 'Can I cancel or modify my order after placing it?',
      a: 'Orders can be modified or cancelled within 2 hours of placement before our atelier begins garment picking and packing. Simply reach out via this concierge form or email support@shopsphere.in with your Order ID.'
    }
  ];

  const validate = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = 'Please provide your full name.';
    }
    if (!formData.email.trim()) {
      errors.email = 'Please provide your email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Please provide a valid email address.';
    }
    if (!formData.message.trim() || formData.message.trim().length < 10) {
      errors.message = 'Please provide a detailed inquiry (at least 10 characters).';
    }
    return errors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = validate();
    setFormErrors(errors);

    if (Object.keys(errors).length === 0) {
      setIsSubmitting(true);
      // Simulate concierge dispatch
      setTimeout(() => {
        setIsSubmitting(false);
        setIsSubmitted(true);
        setFormData({
          name: '',
          email: '',
          category: 'order_status',
          orderNumber: '',
          message: ''
        });
      }, 600);
    }
  };

  return (
    <div className="bg-[#FDFBF7] text-[#161513] min-h-screen">
      <SEO
        title="Atelier Concierge & Customer Care"
        description="Connect with ShopSphere Customer Care for order tracking, size advice, returns, and bespoke fashion inquiries."
      />

      {/* Header */}
      <section className="py-14 sm:py-20 border-b border-[#EAE5DA]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#827E77] block mb-3">
            Atelier Customer Care
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl font-normal tracking-tight text-[#161513] mb-4">
            How May We Assist You?
          </h1>
          <p className="text-sm sm:text-base text-[#4B4843] max-w-xl mx-auto font-light leading-relaxed">
            Whether you need sizing guidance, styling consultation, or assistance with an existing order, our dedicated concierge team is at your service.
          </p>
        </div>
      </section>

      {/* Main Form & Contact Info Section */}
      <section className="py-12 sm:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          
          {/* Left: Contact Form (7 cols) */}
          <div className="lg:col-span-7 bg-white p-6 sm:p-10 rounded-xl border border-[#EAE5DA] shadow-xs">
            <div className="flex items-center gap-2 mb-6">
              <MessageSquare className="w-5 h-5 text-[#161513]" />
              <h2 className="font-serif text-xl sm:text-2xl text-[#161513]">Send an Atelier Message</h2>
            </div>

            {isSubmitted ? (
              <div className="py-12 text-center space-y-4">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-2xl text-[#161513]">Message Received</h3>
                <p className="text-sm text-[#4B4843] max-w-md mx-auto leading-relaxed">
                  Thank you for contacting ShopSphere. A dedicated client advisor will review your request and respond to your email within 12 business hours.
                </p>
                <button
                  type="button"
                  onClick={() => setIsSubmitted(false)}
                  className="mt-4 inline-block text-xs uppercase tracking-wider font-semibold text-[#161513] border-b border-[#161513] pb-0.5 hover:text-[#827E77] transition-colors"
                >
                  Send another inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="name" className="block text-xs uppercase tracking-wider font-semibold text-[#161513] mb-1.5">
                      Your Name *
                    </label>
                    <input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Priya Sharma"
                      className={`w-full px-3.5 py-2.5 bg-[#FDFBF7] border rounded text-xs text-[#161513] focus:outline-none focus:border-[#161513] transition-colors ${
                        formErrors.name ? 'border-rose-500' : 'border-[#EAE5DA]'
                      }`}
                    />
                    {formErrors.name && (
                      <p className="text-[11px] text-rose-600 mt-1">{formErrors.name}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-xs uppercase tracking-wider font-semibold text-[#161513] mb-1.5">
                      Email Address *
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.g. priya@example.com"
                      className={`w-full px-3.5 py-2.5 bg-[#FDFBF7] border rounded text-xs text-[#161513] focus:outline-none focus:border-[#161513] transition-colors ${
                        formErrors.email ? 'border-rose-500' : 'border-[#EAE5DA]'
                      }`}
                    />
                    {formErrors.email && (
                      <p className="text-[11px] text-rose-600 mt-1">{formErrors.email}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="category" className="block text-xs uppercase tracking-wider font-semibold text-[#161513] mb-1.5">
                      Inquiry Subject
                    </label>
                    <select
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#FDFBF7] border border-[#EAE5DA] rounded text-xs text-[#161513] focus:outline-none focus:border-[#161513] transition-colors"
                    >
                      {categories.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="orderNumber" className="block text-xs uppercase tracking-wider font-semibold text-[#161513] mb-1.5">
                      Order ID (Optional)
                    </label>
                    <input
                      id="orderNumber"
                      type="text"
                      value={formData.orderNumber}
                      onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                      placeholder="e.g. ORD-2026-XXXX"
                      className="w-full px-3.5 py-2.5 bg-[#FDFBF7] border border-[#EAE5DA] rounded text-xs text-[#161513] focus:outline-none focus:border-[#161513] transition-colors"
                    >
                    </input>
                  </div>
                </div>

                <div>
                  <label htmlFor="message" className="block text-xs uppercase tracking-wider font-semibold text-[#161513] mb-1.5">
                    Your Message *
                  </label>
                  <textarea
                    id="message"
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Describe your inquiry in detail..."
                    className={`w-full px-3.5 py-2.5 bg-[#FDFBF7] border rounded text-xs text-[#161513] focus:outline-none focus:border-[#161513] transition-colors resize-none ${
                      formErrors.message ? 'border-rose-500' : 'border-[#EAE5DA]'
                    }`}
                  />
                  {formErrors.message && (
                    <p className="text-[11px] text-rose-600 mt-1">{formErrors.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#161513] text-[#FDFBF7] text-xs uppercase tracking-widest font-semibold px-8 py-3.5 rounded hover:bg-[#34302C] transition-colors disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <span>Dispatching...</span>
                  ) : (
                    <>
                      <span>Submit Inquiry</span>
                      <Send className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Right: Concierge Directory (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-6 sm:p-8 rounded-xl border border-[#EAE5DA] shadow-xs space-y-6">
              <h3 className="font-serif text-lg text-[#161513]">Customer Care & Project Directory</h3>
              
              <div className="space-y-5 text-xs text-[#4B4843]">
                <div className="flex items-start gap-3.5">
                  <Mail className="w-4 h-4 text-[#161513] mt-0.5 shrink-0" />
                  <div>
                    <span className="font-semibold text-[#161513] block">Support Email</span>
                    <a href="mailto:support@shopsphere.in" className="hover:underline text-[#161513]">
                      support@shopsphere.in
                    </a>
                    <p className="text-[11px] text-[#827E77] mt-0.5">Project development support channel</p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <Phone className="w-4 h-4 text-[#161513] mt-0.5 shrink-0" />
                  <div>
                    <span className="font-semibold text-[#161513] block">Customer Care Hotline</span>
                    <span className="text-[#827E77] italic">[ Development Placeholder — +91 (Demo) 0000-0000 ]</span>
                    <p className="text-[11px] text-[#827E77] mt-0.5">Operating Hours: Monday – Saturday, 9:00 AM – 7:00 PM IST</p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <MapPin className="w-4 h-4 text-[#161513] mt-0.5 shrink-0" />
                  <div>
                    <span className="font-semibold text-[#161513] block">Digital Flagship & Registered Office</span>
                    <p className="leading-relaxed text-[#827E77]">
                      ShopSphere Digital Atelier<br />
                      Bengaluru, Karnataka, India<br />
                      <span className="text-[10px] text-[#827E77] italic">[ Local Development & Portfolio Demonstration ]</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <Clock className="w-4 h-4 text-[#161513] mt-0.5 shrink-0" />
                  <div>
                    <span className="font-semibold text-[#161513] block">Service Hours</span>
                    <p>Mon - Sat: 9:00 AM – 7:00 PM IST</p>
                    <p className="text-[#827E77]">Sunday: System maintenance & collection curation</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#F7F4EC] p-6 rounded-xl border border-[#EAE5DA] text-xs text-[#4B4843] space-y-2">
              <span className="font-semibold text-[#161513] uppercase tracking-wider block text-[10px]">
                Project Repository & Developer Inquiries
              </span>
              <p>
                ShopSphere is an open full-stack e-commerce architecture project. For documentation, source code, and developer contributions, visit the <a href="https://github.com/KiranKishore05/ShopSphere" target="_blank" rel="noopener noreferrer" className="font-medium text-[#161513] underline">GitHub Repository</a>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section className="py-16 sm:py-20 border-t border-[#EAE5DA] max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="text-xs uppercase tracking-widest font-semibold text-[#827E77]">
            Immediate Answers
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl text-[#161513] mt-2">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={faq.q}
                className="bg-white rounded-lg border border-[#EAE5DA] overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? -1 : idx)}
                  className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 hover:bg-[#FDFBF7] transition-colors"
                >
                  <span className="font-serif text-sm sm:text-base text-[#161513] font-medium">
                    {faq.q}
                  </span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-[#827E77] shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#827E77] shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-[#4B4843] leading-relaxed border-t border-[#F7F4EC]">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
