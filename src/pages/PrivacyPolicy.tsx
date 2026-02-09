import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicy: React.FC = () => {
  const navigate = useNavigate();

  const sections = [
    {
      title: '1. Information We Collect',
      content: `We collect information you provide directly: email, username, profile information, photos, and content you post. We also collect usage data: device information, log data, and how you interact with our service.`,
    },
    {
      title: '2. How We Use Your Information',
      content: `We use your information to: provide and maintain the service; personalize your experience; communicate with you; analyze usage patterns; prevent fraud and abuse; and comply with legal obligations.`,
    },
    {
      title: '3. Information Sharing',
      content: `We do not sell your personal information. We may share data with: service providers who assist our operations; law enforcement when required by law; other users based on your privacy settings.`,
    },
    {
      title: '4. Your Privacy Controls',
      content: `You control your privacy through: Public/Private account settings - choose who sees your posts and reels; Story visibility - control who can view your stories; Activity status - show or hide when you're online; Message settings - control who can message you; Blocking and restricting - manage who can interact with you.`,
    },
    {
      title: '5. Data Retention',
      content: `We retain your data for as long as your account is active or as needed to provide services. When you delete content, it is removed from our servers within 30 days. Some data may be retained for legal compliance.`,
    },
    {
      title: '6. Data Security',
      content: `We implement industry-standard security measures including: encryption in transit and at rest; secure authentication; regular security audits; access controls and monitoring. However, no method of transmission is 100% secure.`,
    },
    {
      title: '7. Children\'s Privacy',
      content: `NJOY is not intended for users under 13 years of age. We do not knowingly collect personal information from children under 13. If we discover such data has been collected, we will delete it immediately.`,
    },
    {
      title: '8. Third-Party Services',
      content: `We use third-party services for authentication (Firebase), media storage (Cloudinary), and analytics. These services have their own privacy policies. We only share the minimum data necessary for their operation.`,
    },
    {
      title: '9. Cookies and Tracking',
      content: `We use cookies and similar technologies to: maintain your session; remember your preferences; analyze service usage. You can control cookies through your browser settings.`,
    },
    {
      title: '10. Your Rights',
      content: `Depending on your location, you may have rights to: access your personal data; correct inaccurate data; delete your data; port your data to another service; opt out of marketing communications; restrict processing of your data.`,
    },
    {
      title: '11. International Data Transfers',
      content: `Your data may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place for international data transfers.`,
    },
    {
      title: '12. Changes to This Policy',
      content: `We may update this policy periodically. We will notify you of significant changes through the app or email. Your continued use of NJOY after changes indicates acceptance of the updated policy.`,
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="flex items-center h-14 px-4 max-w-lg mx-auto">
          <button onClick={() => navigate('/settings')} className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="font-display font-semibold text-lg ml-2">Privacy Policy</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Privacy Policy</h2>
          <p className="text-muted-foreground text-sm">
            Last updated: February 2026
          </p>
        </motion.div>

        {/* Summary Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-primary/10 rounded-lg p-4 mb-6"
        >
          <h3 className="font-semibold text-sm mb-2">Privacy at a Glance</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• We never sell your personal data</li>
            <li>• You control who sees your content</li>
            <li>• You can download or delete your data anytime</li>
            <li>• We use encryption to protect your information</li>
          </ul>
        </motion.div>

        {/* Policy Sections */}
        <div className="space-y-6">
          {sections.map((section, index) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              className="bg-card rounded-lg border border-border p-4"
            >
              <h3 className="font-semibold text-sm mb-2">{section.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {section.content}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Contact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-8 text-center text-sm text-muted-foreground"
        >
          <p>For privacy-related inquiries, contact our Data Protection Officer at</p>
          <a href="mailto:privacy@njoy.app" className="text-primary hover:underline">
            privacy@njoy.app
          </a>
        </motion.div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
