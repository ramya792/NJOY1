import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail, MessageCircle, Shield, HelpCircle, FileQuestion, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const HelpCenter: React.FC = () => {
  const navigate = useNavigate();

  const faqCategories = [
    {
      title: 'Account & Login',
      icon: <User className="w-5 h-5" />,
      items: [
        {
          question: 'How do I reset my password?',
          answer: 'Go to Settings > Security > Change Password. You\'ll need to enter your current password and then create a new one that meets our security requirements.',
        },
        {
          question: 'How do I change my username?',
          answer: 'Navigate to Settings > Account > Change Username. Usernames must be unique and can contain letters, numbers, and special characters.',
        },
        {
          question: 'How do I make my account private?',
          answer: 'Go to Settings > Account Privacy and toggle on "Private Account". Only approved followers will be able to see your posts and stories.',
        },
      ],
    },
    {
      title: 'Privacy & Security',
      icon: <Shield className="w-5 h-5" />,
      items: [
        {
          question: 'How do I block someone?',
          answer: 'Visit their profile, tap the menu (three dots), and select "Block User". Blocked users cannot see your profile, posts, or stories.',
        },
        {
          question: 'What happens when I restrict someone?',
          answer: 'Restricted users can still see your content, but their comments on your posts will only be visible to them unless you approve them.',
        },
        {
          question: 'How do I control who sees my stories?',
          answer: 'When posting a story, you can choose visibility: followers only, people you follow, or both. You can also hide your story from specific people.',
        },
      ],
    },
    {
      title: 'Messaging',
      icon: <MessageCircle className="w-5 h-5" />,
      items: [
        {
          question: 'How do I send voice messages?',
          answer: 'In any chat, tap and hold the microphone icon to record. Release to send, or swipe left to cancel.',
        },
        {
          question: 'Can I delete messages for everyone?',
          answer: 'Yes, tap and hold any message you sent, then select "Delete for everyone". This removes the message from both devices.',
        },
        {
          question: 'How do I save important messages?',
          answer: 'Tap and hold any message and select "Save Message". You can find all saved messages in your profile under Saved.',
        },
      ],
    },
    {
      title: 'Content & Posts',
      icon: <FileQuestion className="w-5 h-5" />,
      items: [
        {
          question: 'How do I save posts and reels?',
          answer: 'Tap the bookmark icon on any post or reel to save it. Access your saved content from your profile.',
        },
        {
          question: 'Why can\'t I see someone\'s posts?',
          answer: 'Their account may be private. Send a follow request to see their content once approved.',
        },
        {
          question: 'How do I report inappropriate content?',
          answer: 'Tap the menu on any post and select "Report". Choose the reason and our team will review it.',
        },
      ],
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
          <h1 className="font-display font-semibold text-lg ml-2">Help Center</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <HelpCircle className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">How can we help?</h2>
          <p className="text-muted-foreground text-sm">
            Find answers to common questions or reach out to our support team.
          </p>
        </motion.div>

        {/* FAQ Categories */}
        <div className="space-y-6">
          {faqCategories.map((category, categoryIndex) => (
            <motion.div
              key={category.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: categoryIndex * 0.1 }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="text-primary">{category.icon}</div>
                <h3 className="font-semibold">{category.title}</h3>
              </div>
              <Accordion type="single" collapsible className="bg-card rounded-lg border border-border">
                {category.items.map((item, index) => (
                  <AccordionItem key={index} value={`${categoryIndex}-${index}`} className="border-border">
                    <AccordionTrigger className="px-4 text-left text-sm">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="px-4 text-sm text-muted-foreground">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.div>
          ))}
        </div>

        {/* Contact Support */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 p-4 bg-card rounded-lg border border-border text-center"
        >
          <h3 className="font-semibold mb-2">Still need help?</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Our support team is here to assist you.
          </p>
          <a
            href="mailto:support@njoy.app"
            className="inline-flex items-center gap-2 text-primary text-sm font-medium hover:underline"
          >
            <Mail className="w-4 h-4" />
            support@njoy.app
          </a>
        </motion.div>
      </div>
    </div>
  );
};

export default HelpCenter;
