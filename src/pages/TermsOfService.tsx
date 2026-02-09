import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TermsOfService: React.FC = () => {
  const navigate = useNavigate();

  const sections = [
    {
      title: '1. Acceptance of Terms',
      content: `By accessing and using NJOY, you accept and agree to be bound by the terms and provisions of this agreement. If you do not agree to abide by the above, please do not use this service.`,
    },
    {
      title: '2. User Accounts',
      content: `You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account. Each user must have a unique username and user ID - duplicates are not permitted.`,
    },
    {
      title: '3. User Content',
      content: `You retain ownership of any content you post to NJOY. By posting content, you grant us a non-exclusive, worldwide, royalty-free license to use, display, and distribute your content on our platform. You are solely responsible for any content you post.`,
    },
    {
      title: '4. Prohibited Conduct',
      content: `You agree not to: post harmful, threatening, abusive, or harassing content; impersonate others; violate any laws; interfere with the service's operation; attempt to access unauthorized areas; or use automated systems to access the service.`,
    },
    {
      title: '5. Privacy',
      content: `Your privacy is important to us. Our Privacy Policy explains how we collect, use, and protect your personal information. By using NJOY, you consent to our data practices as described in our Privacy Policy.`,
    },
    {
      title: '6. Intellectual Property',
      content: `NJOY and its original content, features, and functionality are owned by NJOY and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.`,
    },
    {
      title: '7. Account Privacy Settings',
      content: `You can control who sees your content through privacy settings. Public accounts allow anyone to view posts and reels. Private accounts restrict content to approved followers only. Story visibility can be customized separately.`,
    },
    {
      title: '8. Messaging and Communications',
      content: `Messages sent through NJOY are private between participants. You can delete messages for yourself or for everyone. We do not monitor private messages except when reported for violations.`,
    },
    {
      title: '9. Blocking and Restricting',
      content: `You have the right to block or restrict any user. Blocked users cannot see your profile or content. Restricted users' interactions are limited but not fully blocked.`,
    },
    {
      title: '10. Termination',
      content: `We may terminate or suspend your account immediately, without prior notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties, or for any other reason at our sole discretion.`,
    },
    {
      title: '11. Limitation of Liability',
      content: `In no event shall NJOY, its directors, employees, partners, agents, suppliers, or affiliates be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the service.`,
    },
    {
      title: '12. Changes to Terms',
      content: `We reserve the right to modify these terms at any time. We will notify users of significant changes via the app or email. Continued use after changes constitutes acceptance of the new terms.`,
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
          <h1 className="font-display font-semibold text-lg ml-2">Terms of Service</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Terms of Service</h2>
          <p className="text-muted-foreground text-sm">
            Last updated: February 2026
          </p>
        </motion.div>

        {/* Terms Sections */}
        <div className="space-y-6">
          {sections.map((section, index) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-card rounded-lg border border-border p-4"
            >
              <h3 className="font-semibold text-sm mb-2">{section.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {section.content}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8 text-center text-sm text-muted-foreground"
        >
          <p>If you have any questions about these Terms, please contact us at</p>
          <a href="mailto:legal@njoy.app" className="text-primary hover:underline">
            legal@njoy.app
          </a>
        </motion.div>
      </div>
    </div>
  );
};

export default TermsOfService;
