import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Instagram,
  Facebook,
  Phone,
  Send,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Tag,
  Plus,
  Search,
  Filter,
  RefreshCw,
  ShoppingBag,
  ExternalLink,
  Bot,
  Zap,
  Calendar,
  Layers,
  ChevronRight,
  Info,
  X,
  Play
} from 'lucide-react';

interface MessageItem {
  id: string;
  customerName: string;
  customerHandle: string;
  channel: 'instagram' | 'facebook' | 'whatsapp' | 'tiktok';
  avatar: string;
  message: string;
  receivedAt: string;
  status: 'new' | 'drafted' | 'scheduled' | 'replied';
  category?: 'Hold Request' | 'Availability Check' | 'Pricing & Discount' | 'Condition & Sizing' | 'Consignment & Sell' | 'Store Hours & Location' | 'General';
  urgency?: 'High' | 'Medium' | 'Low';
  summary?: string;
  suggestedReply?: string;
  actionItem?: string;
  tags?: string[];
  scheduledFor?: string;
  sentReply?: string;
}

interface ProviderInfo {
  provider: 'api' | 'local';
  apiModel: string;
  apiKeyConfigured: boolean;
  ollamaEndpoint: string;
  ollamaModel: string;
}

const INITIAL_MESSAGES: MessageItem[] = [
  {
    id: 'msg-1',
    customerName: 'Sarah Jenkins',
    customerHandle: '@sarahj_style',
    channel: 'instagram',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    message: 'Hi! Is that vintage 90s oversized leather trench coat you posted on your Instagram story still available? Can you please hold it for me until tomorrow afternoon? I can swing by around 3pm to try it on!',
    receivedAt: '12 mins ago',
    status: 'new',
    category: 'Hold Request',
    urgency: 'High',
    summary: 'Wants to hold the 90s leather trench coat until tomorrow 3 PM.',
    actionItem: 'Pull vintage leather trench to hold rack behind desk',
    tags: ['#HoldRequest', '#VintageTrench', '#InstagramDM'],
  },
  {
    id: 'msg-2',
    customerName: 'Marcus Brody',
    customerHandle: 'Marcus Brody',
    channel: 'facebook',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    message: 'Hello! Do you buy vintage denim directly? I have about 10 pairs of 80s/90s Levi 501s (all USA made) and wanted to know your consignment split or cash buyout hours.',
    receivedAt: '45 mins ago',
    status: 'new',
    category: 'Consignment & Sell',
    urgency: 'Medium',
    summary: 'Inquiring about consignment/buyout terms for 10 vintage Levi 501s.',
    actionItem: 'Check buyer appointment schedule for Thursday',
    tags: ['#Consignment', '#VintageLevis', '#Facebook'],
  },
  {
    id: 'msg-3',
    customerName: 'Elena Rostova',
    customerHandle: '+1 (555) 234-8910',
    channel: 'whatsapp',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    message: 'Good morning! What are the exact bust and waist measurements for that 1970s floral prairie dress in the front display? Wondering if it fits a modern size 4 or 6.',
    receivedAt: '2 hours ago',
    status: 'drafted',
    category: 'Condition & Sizing',
    urgency: 'Medium',
    summary: 'Requesting bust/waist dimensions for the 70s floral prairie dress.',
    suggestedReply: 'Good morning Elena! The 70s prairie dress measures 34" bust and 26-27" waist, making it a great fit for a modern US 4! Let us know if you want us to set it aside for you to try on.',
    actionItem: 'Measure front display dress and check zipper',
    tags: ['#Measurements', '#70sPrairieDress', '#WhatsApp'],
  },
  {
    id: 'msg-4',
    customerName: 'Chloe & Maya',
    customerHandle: '@thrifttwins_la',
    channel: 'instagram',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    message: 'Hey friends! Are you guys open this Sunday for the neighborhood flea market? Planning a road trip with 4 friends to shop!',
    receivedAt: '3 hours ago',
    status: 'replied',
    category: 'Store Hours & Location',
    urgency: 'Low',
    summary: 'Asking about Sunday hours for upcoming weekend flea market trip.',
    sentReply: 'Hey Chloe & Maya! Yes! We will be open Sunday 11am-6pm with fresh racks rolled out. Excited to have you all visit!',
    tags: ['#StoreHours', '#WeekendVisit'],
  },
];

export default function App() {
  const [messages, setMessages] = useState<MessageItem[]>(INITIAL_MESSAGES);
  const [selectedId, setSelectedId] = useState<string>(INITIAL_MESSAGES[0].id);
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [tone, setTone] = useState<'friendly' | 'quick' | 'formal'>('friendly');

  // AI State
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [customReplyText, setCustomReplyText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Provider state
  const [providerInfo, setProviderInfo] = useState<ProviderInfo>({
    provider: 'api',
    apiModel: 'gemma-4-26b-a4b-it',
    apiKeyConfigured: true,
    ollamaEndpoint: 'http://localhost:11434',
    ollamaModel: 'gemma4:e2b',
  });

  // Modals
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showProviderModal, setShowProviderModal] = useState<boolean>(false);
  const [showSmokeTestModal, setShowSmokeTestModal] = useState<boolean>(false);
  const [smokeTestRunning, setSmokeTestRunning] = useState<boolean>(false);
  const [smokeTestResult, setSmokeTestResult] = useState<{ status: string; details: any } | null>(null);

  // New message form state
  const [newMsgForm, setNewMsgForm] = useState({
    customerName: '',
    customerHandle: '',
    channel: 'instagram' as const,
    message: '',
  });

  // Scheduling state
  const [scheduleTime, setScheduleTime] = useState<string>('tomorrow-930am');
  const [showScheduleDropdown, setShowScheduleDropdown] = useState<boolean>(false);

  // Fetch provider info on mount
  useEffect(() => {
    fetch('/api/provider-info')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setProviderInfo({
            provider: data.provider,
            apiModel: data.apiModel,
            apiKeyConfigured: data.apiKeyConfigured,
            ollamaEndpoint: data.ollamaEndpoint,
            ollamaModel: data.ollamaModel,
          });
        }
      })
      .catch((err) => console.log('Could not load provider info:', err));
  }, []);

  const selectedMessage = messages.find((m) => m.id === selectedId) || messages[0];

  // Update reply draft textarea whenever selected message changes
  useEffect(() => {
    if (selectedMessage) {
      setCustomReplyText(selectedMessage.suggestedReply || selectedMessage.sentReply || '');
      setErrorMessage(null);
    }
  }, [selectedId, selectedMessage?.suggestedReply, selectedMessage?.sentReply]);

  // Trigger Gemma 4 AI Triage & Draft
  const handleGenerateReply = async () => {
    if (!selectedMessage) return;
    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: selectedMessage.message,
          customerName: selectedMessage.customerName,
          channel: selectedMessage.channel,
          storeName: 'Velvet & Thread Vintage Boutique',
          tone,
        }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to analyze message with Gemma 4');
      }

      const resData = data.data;

      // Update message in state
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === selectedMessage.id) {
            return {
              ...msg,
              category: resData.category,
              urgency: resData.urgency,
              summary: resData.summary,
              suggestedReply: resData.suggestedReply,
              actionItem: resData.actionItem,
              tags: resData.tags,
              status: msg.status === 'replied' ? 'replied' : 'drafted',
            };
          }
          return msg;
        })
      );

      setCustomReplyText(resData.suggestedReply);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error calling Gemma 4';
      setErrorMessage(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  // Send reply immediately
  const handleSendNow = () => {
    if (!selectedMessage) return;
    const replyToSend = customReplyText.trim();
    if (!replyToSend) return;

    setMessages((prev) =>
      prev.map((m) =>
        m.id === selectedMessage.id
          ? {
              ...m,
              status: 'replied',
              sentReply: replyToSend,
              suggestedReply: undefined,
              scheduledFor: undefined,
            }
          : m
      )
    );
  };

  // Schedule reply
  const handleScheduleReply = (timing: string) => {
    if (!selectedMessage) return;
    const replyToSend = customReplyText.trim();
    if (!replyToSend) return;

    let scheduleLabel = 'Tomorrow at 9:30 AM (Store Opening)';
    if (timing === 'today-5pm') scheduleLabel = 'Today at 5:00 PM';
    if (timing === 'in-1hr') scheduleLabel = 'In 1 hour';
    if (timing === 'weekend') scheduleLabel = 'Saturday at 10:00 AM';

    setMessages((prev) =>
      prev.map((m) =>
        m.id === selectedMessage.id
          ? {
              ...m,
              status: 'scheduled',
              scheduledFor: scheduleLabel,
              suggestedReply: replyToSend,
            }
          : m
      )
    );
    setShowScheduleDropdown(false);
  };

  // Add custom message
  const handleCreateNewMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsgForm.message.trim()) return;

    const newId = `msg-${Date.now()}`;
    const newMsg: MessageItem = {
      id: newId,
      customerName: newMsgForm.customerName.trim() || 'New Customer',
      customerHandle: newMsgForm.customerHandle.trim() || '@customer',
      channel: newMsgForm.channel,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      message: newMsgForm.message.trim(),
      receivedAt: 'Just now',
      status: 'new',
    };

    setMessages([newMsg, ...messages]);
    setSelectedId(newId);
    setShowAddModal(false);
    setNewMsgForm({
      customerName: '',
      customerHandle: '',
      channel: 'instagram',
      message: '',
    });
  };

  // Run Smoke Test
  const handleRunSmokeTest = async () => {
    setSmokeTestRunning(true);
    setSmokeTestResult(null);
    setShowSmokeTestModal(true);

    try {
      const res = await fetch('/api/smoke-test');
      const data = await res.json();
      setSmokeTestResult({
        status: data.status,
        details: data,
      });
    } catch (err: unknown) {
      setSmokeTestResult({
        status: 'FAIL',
        details: { error: err instanceof Error ? err.message : 'Network error' },
      });
    } finally {
      setSmokeTestRunning(false);
    }
  };

  // Filter messages
  const filteredMessages = messages.filter((m) => {
    if (channelFilter !== 'all' && m.channel !== channelFilter) return false;
    if (statusFilter === 'holds' && m.category !== 'Hold Request') return false;
    if (statusFilter === 'scheduled' && m.status !== 'scheduled') return false;
    if (statusFilter === 'replied' && m.status !== 'replied') return false;
    if (statusFilter === 'pending' && (m.status === 'replied' || m.status === 'scheduled')) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText = `${m.customerName} ${m.message} ${m.category || ''} ${m.summary || ''}`.toLowerCase();
      if (!matchText.includes(q)) return false;
    }
    return true;
  });

  const getChannelBadge = (channel: MessageItem['channel']) => {
    switch (channel) {
      case 'instagram':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
            <Instagram className="w-3 h-3 text-rose-500" /> Instagram
          </span>
        );
      case 'facebook':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <Facebook className="w-3 h-3 text-blue-600" /> Messenger
          </span>
        );
      case 'whatsapp':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Phone className="w-3 h-3 text-emerald-600" /> WhatsApp
          </span>
        );
      case 'tiktok':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-900 text-white">
            TikTok
          </span>
        );
    }
  };

  const getUrgencyBadge = (urgency?: string) => {
    if (urgency === 'High') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
          <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span> High Urgency
        </span>
      );
    }
    if (urgency === 'Medium') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
          Medium
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
        Normal
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-30 px-4 sm:px-6 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-800 text-amber-50 flex items-center justify-center font-serif text-xl font-bold shadow-xs">
              U
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight font-serif text-stone-900">unify</h1>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-900 text-[11px] font-medium rounded-full">
                  Thrift & Boutique Hub
                </span>
              </div>
              <p className="text-xs text-stone-500">Collect, sort & schedule social replies with Gemma 4</p>
            </div>
          </div>

          {/* Provider pill & tools */}
          <div className="flex items-center gap-2.5">
            {/* Active Provider Indicator Button */}
            <button
              onClick={() => setShowProviderModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-lg text-xs font-medium text-stone-800 transition-colors"
              title="Click to view Gemma 4 provider settings"
            >
              <Bot className="w-3.5 h-3.5 text-amber-700" />
              <span>
                Engine: <strong className="font-semibold">{providerInfo.provider === 'api' ? 'Gemma 4 (Cloud API)' : 'Gemma 4 (Local Ollama)'}</strong>
              </span>
              <span className={`w-2 h-2 rounded-full ${providerInfo.provider === 'api' ? 'bg-emerald-500' : 'bg-blue-500'}`}></span>
            </button>

            {/* Run Smoke Test */}
            <button
              onClick={handleRunSmokeTest}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-lg text-xs font-medium transition-colors"
            >
              <Play className="w-3.5 h-3.5 text-amber-700 fill-amber-700" />
              <span>Smoke Test</span>
            </button>

            {/* Add Message Button */}
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>New Message</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Workspace */}
      <div className="max-w-7xl w-full mx-auto p-4 sm:p-6 flex-1 flex flex-col lg:flex-row gap-6">
        
        {/* Left Column: Messages List & Filters */}
        <div className="lg:w-5/12 flex flex-col bg-white border border-stone-200 rounded-2xl shadow-xs overflow-hidden">
          
          {/* Search & Channel Tabs */}
          <div className="p-4 border-b border-stone-200 space-y-3 bg-stone-50/50">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
              <input
                type="text"
                placeholder="Search inquiries, items, tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-stone-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-800/20 focus:border-amber-800"
              />
            </div>

            {/* Channel filter pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
              <button
                onClick={() => setChannelFilter('all')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap ${
                  channelFilter === 'all'
                    ? 'bg-amber-800 text-white'
                    : 'bg-stone-200/70 text-stone-700 hover:bg-stone-200'
                }`}
              >
                All Channels ({messages.length})
              </button>
              <button
                onClick={() => setChannelFilter('instagram')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap ${
                  channelFilter === 'instagram'
                    ? 'bg-rose-600 text-white'
                    : 'bg-stone-200/70 text-stone-700 hover:bg-stone-200'
                }`}
              >
                <Instagram className="w-3 h-3" /> Instagram
              </button>
              <button
                onClick={() => setChannelFilter('facebook')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap ${
                  channelFilter === 'facebook'
                    ? 'bg-blue-600 text-white'
                    : 'bg-stone-200/70 text-stone-700 hover:bg-stone-200'
                }`}
              >
                <Facebook className="w-3 h-3" /> Messenger
              </button>
              <button
                onClick={() => setChannelFilter('whatsapp')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap ${
                  channelFilter === 'whatsapp'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-stone-200/70 text-stone-700 hover:bg-stone-200'
                }`}
              >
                <Phone className="w-3 h-3" /> WhatsApp
              </button>
            </div>

            {/* Status Tabs */}
            <div className="flex border-b border-stone-200 text-xs">
              <button
                onClick={() => setStatusFilter('all')}
                className={`pb-2 px-2.5 border-b-2 font-medium transition-colors ${
                  statusFilter === 'all' ? 'border-amber-800 text-amber-900' : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`pb-2 px-2.5 border-b-2 font-medium transition-colors ${
                  statusFilter === 'pending' ? 'border-amber-800 text-amber-900' : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                Needs Reply ({messages.filter(m => m.status === 'new' || m.status === 'drafted').length})
              </button>
              <button
                onClick={() => setStatusFilter('holds')}
                className={`pb-2 px-2.5 border-b-2 font-medium transition-colors ${
                  statusFilter === 'holds' ? 'border-amber-800 text-amber-900' : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                Holds ({messages.filter(m => m.category === 'Hold Request').length})
              </button>
              <button
                onClick={() => setStatusFilter('scheduled')}
                className={`pb-2 px-2.5 border-b-2 font-medium transition-colors ${
                  statusFilter === 'scheduled' ? 'border-amber-800 text-amber-900' : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                Scheduled ({messages.filter(m => m.status === 'scheduled').length})
              </button>
              <button
                onClick={() => setStatusFilter('replied')}
                className={`pb-2 px-2.5 border-b-2 font-medium transition-colors ${
                  statusFilter === 'replied' ? 'border-amber-800 text-amber-900' : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                Sent ({messages.filter(m => m.status === 'replied').length})
              </button>
            </div>
          </div>

          {/* List of messages */}
          <div className="flex-1 divide-y divide-stone-100 overflow-y-auto max-h-[620px]">
            {filteredMessages.length === 0 ? (
              <div className="p-8 text-center text-stone-400">
                <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-30 text-amber-900" />
                <p className="text-sm font-medium text-stone-600">No messages match your filters</p>
                <p className="text-xs text-stone-400 mt-1">Try resetting the filter or add a new customer message.</p>
              </div>
            ) : (
              filteredMessages.map((item) => {
                const isSelected = item.id === selectedId;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    className={`p-3.5 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-amber-50/70 border-l-4 border-l-amber-800'
                        : 'hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <img
                          src={item.avatar}
                          alt={item.customerName}
                          className="w-8 h-8 rounded-full object-cover border border-stone-200"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-xs text-stone-900">{item.customerName}</span>
                            {getChannelBadge(item.channel)}
                          </div>
                          <span className="text-[11px] text-stone-500">{item.customerHandle}</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-stone-400 whitespace-nowrap">{item.receivedAt}</span>
                    </div>

                    <p className="text-xs text-stone-700 line-clamp-2 my-1.5 leading-relaxed">
                      {item.message}
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-1.5 mt-2 pt-1 border-t border-stone-100/60">
                      <div className="flex items-center gap-1">
                        {item.category && (
                          <span className="text-[10px] px-2 py-0.5 rounded-sm bg-stone-100 text-stone-700 font-medium">
                            {item.category}
                          </span>
                        )}
                        {item.urgency === 'High' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-red-50 text-red-700 font-semibold">
                            High
                          </span>
                        )}
                      </div>

                      {item.status === 'replied' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Replied
                        </span>
                      ) : item.status === 'scheduled' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-medium">
                          <Clock className="w-3.5 h-3.5" /> Scheduled
                        </span>
                      ) : item.status === 'drafted' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-purple-700 font-medium">
                          <Sparkles className="w-3.5 h-3.5" /> AI Drafted
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-stone-500 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span> New
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Gemma 4 Workspace & Reply Composer */}
        <div className="lg:w-7/12 flex flex-col gap-4">
          
          {selectedMessage ? (
            <div className="bg-white border border-stone-200 rounded-2xl shadow-xs overflow-hidden flex flex-col">
              
              {/* Header with customer info */}
              <div className="p-4 sm:p-5 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3 bg-stone-50/40">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedMessage.avatar}
                    alt={selectedMessage.customerName}
                    className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-xs"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-stone-900">{selectedMessage.customerName}</h2>
                      {getChannelBadge(selectedMessage.channel)}
                    </div>
                    <p className="text-xs text-stone-500">{selectedMessage.customerHandle} • Arrived {selectedMessage.receivedAt}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {selectedMessage.category && (
                    <span className="px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg text-xs font-semibold">
                      {selectedMessage.category}
                    </span>
                  )}
                  {getUrgencyBadge(selectedMessage.urgency)}
                </div>
              </div>

              {/* Customer message box */}
              <div className="p-4 sm:p-5 border-b border-stone-200">
                <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider block mb-1.5">
                  Customer Message:
                </span>
                <div className="p-4 rounded-xl bg-stone-100/80 border border-stone-200 text-stone-800 text-sm leading-relaxed whitespace-pre-wrap">
                  {selectedMessage.message}
                </div>

                {/* AI Summary & Staff Action Item */}
                {(selectedMessage.summary || selectedMessage.actionItem) && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {selectedMessage.summary && (
                      <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200">
                        <span className="font-semibold text-stone-600 block mb-0.5">Summary:</span>
                        <p className="text-stone-700">{selectedMessage.summary}</p>
                      </div>
                    )}
                    {selectedMessage.actionItem && (
                      <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200">
                        <span className="font-semibold text-amber-900 block mb-0.5">Staff Action Item:</span>
                        <p className="text-amber-800">{selectedMessage.actionItem}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Tags */}
                {selectedMessage.tags && selectedMessage.tags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                    {selectedMessage.tags.map((tag, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 text-[11px]">
                        <Tag className="w-3 h-3 text-stone-400" /> {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Gemma 4 Reply Assistant Box */}
              <div className="p-4 sm:p-5 flex-1 flex flex-col bg-stone-50/30">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-800 text-amber-100 flex items-center justify-center">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                        Gemma 4 Reply Assistant
                      </h3>
                      <p className="text-[11px] text-stone-500">
                        Powered by {providerInfo.provider === 'api' ? providerInfo.apiModel : providerInfo.ollamaModel}
                      </p>
                    </div>
                  </div>

                  {/* Tone Picker */}
                  <div className="flex items-center gap-1 bg-stone-200/60 p-0.5 rounded-lg text-xs">
                    <button
                      onClick={() => setTone('friendly')}
                      className={`px-2 py-1 rounded-md font-medium transition-colors ${
                        tone === 'friendly' ? 'bg-white shadow-xs text-amber-900' : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      Friendly
                    </button>
                    <button
                      onClick={() => setTone('quick')}
                      className={`px-2 py-1 rounded-md font-medium transition-colors ${
                        tone === 'quick' ? 'bg-white shadow-xs text-amber-900' : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      Quick & Direct
                    </button>
                    <button
                      onClick={() => setTone('formal')}
                      className={`px-2 py-1 rounded-md font-medium transition-colors ${
                        tone === 'formal' ? 'bg-white shadow-xs text-amber-900' : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      Polished
                    </button>
                  </div>
                </div>

                {/* Error Banner if any */}
                {errorMessage && (
                  <div className="p-3 mb-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-semibold">Notice:</strong> {errorMessage}
                      <p className="text-red-700 mt-0.5">
                        Tip: You can switch to the local Ollama provider or set a valid key in your environment.
                      </p>
                    </div>
                  </div>
                )}

                {/* Trigger Gemma Button */}
                <div className="flex items-center gap-2 mb-3">
                  <button
                    onClick={handleGenerateReply}
                    disabled={isGenerating}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-amber-800 hover:bg-amber-900 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Analyzing with Gemma 4...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>{selectedMessage.suggestedReply ? 'Regenerate Reply with Gemma 4' : 'Sort & Draft Reply with Gemma 4'}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Quick Snippets for Boutique */}
                <div className="flex flex-wrap items-center gap-1.5 mb-2 text-xs">
                  <span className="text-stone-400 text-[11px]">Insert:</span>
                  <button
                    onClick={() => setCustomReplyText((prev) => `${prev} We hold items for up to 24 hours!`)}
                    className="px-2 py-0.5 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-md text-[11px] text-stone-700"
                  >
                    + 24h Hold Policy
                  </button>
                  <button
                    onClick={() => setCustomReplyText((prev) => `${prev} We're open Mon-Sat 10am-7pm & Sun 11am-5pm!`)}
                    className="px-2 py-0.5 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-md text-[11px] text-stone-700"
                  >
                    + Store Hours
                  </button>
                  <button
                    onClick={() => setCustomReplyText((prev) => `${prev} Located at 142 Vintage Lane!`)}
                    className="px-2 py-0.5 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-md text-[11px] text-stone-700"
                  >
                    + Address
                  </button>
                </div>

                {/* Reply Editor */}
                <div className="flex-1 flex flex-col mb-3">
                  <textarea
                    rows={4}
                    value={customReplyText}
                    onChange={(e) => setCustomReplyText(e.target.value)}
                    placeholder="Draft reply will appear here, or you can type freely..."
                    className="w-full p-3.5 text-sm bg-white border border-stone-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-800/20 focus:border-amber-800 text-stone-800 resize-none font-sans leading-relaxed"
                  />
                </div>

                {/* Status notice if scheduled or replied */}
                {selectedMessage.status === 'scheduled' && (
                  <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>This reply is scheduled to send: <strong>{selectedMessage.scheduledFor}</strong></span>
                  </div>
                )}

                {selectedMessage.status === 'replied' && (
                  <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Reply sent successfully to {selectedMessage.customerName} on {selectedMessage.channel}.</span>
                  </div>
                )}

                {/* Action Buttons: Send Now or Schedule */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-200">
                  <div className="relative">
                    <button
                      onClick={() => setShowScheduleDropdown(!showScheduleDropdown)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-800 rounded-xl text-xs font-medium transition-colors"
                    >
                      <Calendar className="w-3.5 h-3.5 text-stone-600" />
                      <span>Schedule Reply</span>
                    </button>

                    {showScheduleDropdown && (
                      <div className="absolute left-0 bottom-full mb-1.5 w-64 bg-white border border-stone-200 rounded-xl shadow-lg p-1.5 z-20 text-xs">
                        <span className="block px-2.5 py-1 text-[10px] font-semibold text-stone-400 uppercase">
                          Select Timing:
                        </span>
                        <button
                          onClick={() => handleScheduleReply('tomorrow-930am')}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-amber-50 hover:text-amber-900 transition-colors"
                        >
                          Tomorrow 9:30 AM (Before shop opens)
                        </button>
                        <button
                          onClick={() => handleScheduleReply('today-5pm')}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-amber-50 hover:text-amber-900 transition-colors"
                        >
                          Today at 5:00 PM (Closing rush)
                        </button>
                        <button
                          onClick={() => handleScheduleReply('in-1hr')}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-amber-50 hover:text-amber-900 transition-colors"
                        >
                          In 1 hour
                        </button>
                        <button
                          onClick={() => handleScheduleReply('weekend')}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-amber-50 hover:text-amber-900 transition-colors"
                        >
                          Saturday at 10:00 AM (Weekend drops)
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSendNow}
                      disabled={!customReplyText.trim()}
                      className="flex items-center gap-2 px-5 py-2 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Now via {selectedMessage.channel.toUpperCase()}</span>
                    </button>
                  </div>
                </div>

              </div>

            </div>
          ) : (
            <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center text-stone-400">
              Select a message to view details
            </div>
          )}

        </div>

      </div>

      {/* Add New Message Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-lg w-full p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-bold text-base text-stone-900">Add Customer Message</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewMessage} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Customer Name / Handle</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jessica Taylor (@jessica_vtg)"
                  value={newMsgForm.customerName}
                  onChange={(e) => setNewMsgForm({ ...newMsgForm, customerName: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-800/20 focus:border-amber-800"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Social Channel</label>
                <select
                  value={newMsgForm.channel}
                  onChange={(e) => setNewMsgForm({ ...newMsgForm, channel: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-800/20 focus:border-amber-800"
                >
                  <option value="instagram">Instagram DM</option>
                  <option value="facebook">Facebook Messenger</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="tiktok">TikTok Direct Message</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Message Text</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Paste or type incoming message here (e.g. inquiry about holding an item, sizing question, or drop-off consignment)..."
                  value={newMsgForm.message}
                  onChange={(e) => setNewMsgForm({ ...newMsgForm, message: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-800/20 focus:border-amber-800 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 text-xs text-stone-600 hover:text-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  Add to Inbox
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Provider & Switcher Information Modal */}
      {showProviderModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-lg w-full p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-amber-800" />
                <h3 className="font-bold text-base text-stone-900">Gemma 4 Provider Settings</h3>
              </div>
              <button
                onClick={() => setShowProviderModal(false)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs text-stone-700">
              <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-stone-900">Current Provider:</span>
                  <span className="px-2 py-0.5 rounded-md font-semibold uppercase bg-amber-100 text-amber-900">
                    {providerInfo.provider}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Active Model:</span>
                  <span className="font-mono text-stone-800">
                    {providerInfo.provider === 'api' ? providerInfo.apiModel : providerInfo.ollamaModel}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">API Key Configured:</span>
                  <span className={providerInfo.apiKeyConfigured ? 'text-emerald-700 font-medium' : 'text-amber-700'}>
                    {providerInfo.apiKeyConfigured ? 'Yes (Server-side)' : 'Not set / Placeholder'}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-stone-900 mb-1">How to switch between API & Local Ollama:</h4>
                <p className="text-stone-600 mb-2 leading-relaxed">
                  In your <code>.env</code> file, set the <code>PROVIDER</code> variable:
                </p>
                <div className="bg-stone-900 text-stone-100 p-3 rounded-lg font-mono text-[11px] space-y-1">
                  <div># Option A: Cloud Google AI Studio Gemma 4</div>
                  <div className="text-amber-300">PROVIDER="api"</div>
                  <div className="text-stone-400">GEMMA_API_MODEL="gemma-4-26b-a4b-it"</div>
                  <div className="mt-2 text-stone-400"># Option B: Local Ollama Fallback</div>
                  <div className="text-blue-300">PROVIDER="local"</div>
                  <div className="text-stone-400">OLLAMA_MODEL="gemma4:e2b"</div>
                  <div className="text-stone-400">OLLAMA_ENDPOINT="http://localhost:11434"</div>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
                <p className="font-semibold mb-0.5">Local Ollama Setup:</p>
                <p>Run <code>ollama run gemma4:e2b</code> in your terminal to start the local model.</p>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowProviderModal(false)}
                className="px-4 py-2 bg-stone-900 text-white rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Smoke Test Live Modal */}
      {showSmokeTestModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-lg w-full p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-amber-800 fill-amber-800" />
                <h3 className="font-bold text-base text-stone-900">Gemma 4 Smoke Test</h3>
              </div>
              <button
                onClick={() => setShowSmokeTestModal(false)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <p className="text-stone-600 leading-relaxed">
                Sends a realistic customer inquiry to the active provider (
                <strong>{providerInfo.provider.toUpperCase()}</strong>) to verify end-to-end connectivity.
              </p>

              {smokeTestRunning ? (
                <div className="p-6 bg-stone-50 rounded-xl border border-stone-200 flex flex-col items-center justify-center gap-2 text-stone-600">
                  <RefreshCw className="w-6 h-6 animate-spin text-amber-800" />
                  <span className="font-medium">Testing provider connection...</span>
                </div>
              ) : smokeTestResult ? (
                <div className="space-y-3">
                  <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
                    smokeTestResult.status === 'PASS'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-red-50 border-red-200 text-red-900'
                  }`}>
                    <div className="flex items-center gap-2">
                      {smokeTestResult.status === 'PASS' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      )}
                      <span className="font-bold text-sm">TEST RESULT: {smokeTestResult.status}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-stone-900 text-stone-200 rounded-xl font-mono text-[11px] overflow-x-auto max-h-48">
                    <pre>{JSON.stringify(smokeTestResult.details, null, 2)}</pre>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-5 flex items-center justify-between">
              <button
                onClick={handleRunSmokeTest}
                disabled={smokeTestRunning}
                className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-semibold"
              >
                Rerun Test
              </button>
              <button
                onClick={() => setShowSmokeTestModal(false)}
                className="px-4 py-2 bg-stone-900 text-white rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white py-3 px-6 text-center text-xs text-stone-500">
        <p>Unify • Powered by Gemma 4 with Local Ollama Fallback • Designed for Thrift Stores & Boutiques</p>
      </footer>
    </div>
  );
}
