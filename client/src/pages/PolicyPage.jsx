import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ShieldCheck, Truck, RotateCcw, FileText } from 'lucide-react';
import SEO from '../components/common/SEO';

export default function PolicyPage() {
  const location = useLocation();
  const path = location.pathname;

  let activeTab = 'shipping';
  if (path.includes('return')) activeTab = 'returns';
  else if (path.includes('privacy')) activeTab = 'privacy';
  else if (path.includes('terms')) activeTab = 'terms';

  const tabs = [
    { id: 'shipping', label: 'Shipping Policy', path: '/shipping-policy', icon: Truck },
    { id: 'returns', label: 'Returns & Exchanges', path: '/returns-policy', icon: RotateCcw },
    { id: 'privacy', label: 'Privacy Policy', path: '/privacy', icon: ShieldCheck },
    { id: 'terms', label: 'Terms of Service', path: '/terms', icon: FileText }
  ];

  return (
    <div className="bg-[#FDFBF7] text-[#161513] min-h-screen">
      <SEO
        title={`${tabs.find(t => t.id === activeTab)?.label || 'Customer Policies'}`}
        description="Review ShopSphere customer policies regarding domestic shipping, easy 7-day returns, data privacy, and terms of service."
      />

      {/* Header */}
      <section className="py-12 sm:py-16 border-b border-[#EAE5DA]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#827E77] block mb-2">
            Transparency & Trust
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#161513]">
            {tabs.find(t => t.id === activeTab)?.label}
          </h1>
          <p className="text-xs text-[#827E77] mt-2">
            Standard E-Commerce Operational Template • ShopSphere India
          </p>
        </div>
      </section>

      {/* Tab Navigation */}
      <div className="border-b border-[#EAE5DA] bg-white sticky top-16 sm:top-18 z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center gap-2 sm:gap-6 overflow-x-auto py-3">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.id === activeTab;
            return (
              <Link
                key={tab.id}
                to={tab.path}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-[#161513] text-[#FDFBF7]'
                    : 'text-[#4B4843] hover:text-[#161513] hover:bg-[#F7F4EC]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Policy Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-sm leading-relaxed text-[#4B4843] space-y-8">
        {activeTab === 'shipping' && (
          <div className="space-y-6">
            <div>
              <h2 className="font-serif text-xl text-[#161513] mb-2">1. Domestic Delivery Coverage</h2>
              <p>ShopSphere ships across all serviceable postal PIN codes within the Republic of India through premier logistics partners including Blue Dart, Delhivery, and DTDC.</p>
            </div>
            <div>
              <h2 className="font-serif text-xl text-[#161513] mb-2">2. Timelines & Shipping Charges</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Metro Cities:</strong> Delivered within 2 to 3 business days from dispatch.</li>
                <li><strong>Non-Metro Regions:</strong> Delivered within 4 to 5 business days.</li>
                <li><strong>Complimentary Shipping:</strong> Enjoy free standard shipping on all prepaid orders exceeding ₹1,999. A flat nominal shipping fee of ₹99 applies on orders below ₹1,999.</li>
              </ul>
            </div>
            <div>
              <h2 className="font-serif text-xl text-[#161513] mb-2">3. Real-Time Consignment Tracking</h2>
              <p>Once your order is picked and dispatched from our Bengaluru atelier, a confirmation email containing the courier tracking number and real-time transit URL is generated and delivered to your registered email address.</p>
            </div>
          </div>
        )}

        {activeTab === 'returns' && (
          <div className="space-y-6">
            <div>
              <h2 className="font-serif text-xl text-[#161513] mb-2">1. 7-Day Easy Return & Exchange Window</h2>
              <p>We want you to love your ShopSphere pieces. If a garment does not fit as desired or meet your expectations, you may initiate a return or exchange request within 7 calendar days of delivery.</p>
            </div>
            <div>
              <h2 className="font-serif text-xl text-[#161513] mb-2">2. Condition Guidelines</h2>
              <p>To qualify for a full refund or exchange, items must be in their pristine original condition: unworn, unwashed, unaltered, and with all atelier tags and security seals intact in original packaging.</p>
            </div>
            <div>
              <h2 className="font-serif text-xl text-[#161513] mb-2">3. Doorstep Reverse Pickup & Refunds</h2>
              <p>We arrange complimentary reverse pickup from your delivery address. Upon warehouse receipt and quality audit (usually 24–48 hours), refunds are processed to your original payment source (credit/debit card, UPI, or net banking) within 5–7 business days.</p>
            </div>
          </div>
        )}

        {activeTab === 'privacy' && (
          <div className="space-y-6">
            <div>
              <h2 className="font-serif text-xl text-[#161513] mb-2">1. Our Commitment to Privacy</h2>
              <p>ShopSphere ("we", "our") respects your personal data. We collect only necessary information required to fulfill orders, process payments securely, and personalize your atelier shopping experience.</p>
            </div>
            <div>
              <h2 className="font-serif text-xl text-[#161513] mb-2">2. Information Collection & Usage</h2>
              <p>We gather contact details (name, email, shipping address, phone) during account creation and checkout. Payment credentials (card details, UPI PINs) are processed strictly via Razorpay’s PCI-DSS Level 1 compliant gateway. We never store or log your credit card numbers or CVV.</p>
            </div>
            <div>
              <h2 className="font-serif text-xl text-[#161513] mb-2">3. Cookies & Security</h2>
              <p>We utilize HTTP-only, secure, SameSite cookies to protect your authentication session against cross-site scripting (XSS) and cross-site request forgery (CSRF). We never sell your personal data to third-party advertisers.</p>
            </div>
          </div>
        )}

        {activeTab === 'terms' && (
          <div className="space-y-6">
            <div>
              <h2 className="font-serif text-xl text-[#161513] mb-2">1. Agreement to Terms</h2>
              <p>By accessing or purchasing from ShopSphere (shopsphere.in), you agree to be bound by these Terms of Service and applicable laws of India.</p>
            </div>
            <div>
              <h2 className="font-serif text-xl text-[#161513] mb-2">2. Product Accuracy & Pricing</h2>
              <p>We make every effort to display garment colors, textures, and dimensions as accurately as possible. Prices are listed in Indian Rupees (INR) and are inclusive of applicable GST unless explicitly stated otherwise.</p>
            </div>
            <div>
              <h2 className="font-serif text-xl text-[#161513] mb-2">3. Governing Law & Jurisdiction</h2>
              <p>These terms shall be governed by and construed in accordance with the laws of India. Any disputes arising out of or related to these terms shall be subject to the exclusive jurisdiction of the courts of Bengaluru, Karnataka.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
