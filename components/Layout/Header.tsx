
import React, { useContext, useState, useEffect, useRef } from 'react';
import { AppContext, AppView } from '../../contexts/AppContext';
import { APP_NAME, MAX_RECENT_CONVERSATIONS_IN_NAV_MENU } from '../../constants';
import { Conversation } from '../../types'; // Import Conversation type
import { 
    SunIcon, MoonIcon, MenuIcon, XIcon, 
    ChatIcon, ImageIcon, CodeBracketIcon, PlayCircleIcon, CogIcon, FolderOpenIcon, 
    PlusIcon, ChatBubbleOvalLeftEllipsisIcon, LogoIcon, PencilIcon, TrashIcon
} from '../ui/Icons';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';


interface NavItem {
  view: AppView;
  label: string;
  icon: React.ReactNode;
}

const appNavItems: NavItem[] = [
  // CHAT is handled separately
  { view: AppView.CODING, label: 'Coding', icon: <CodeBracketIcon className="w-5 h-5 mr-3" /> },
  { view: AppView.IMAGE, label: 'Gambar', icon: <ImageIcon className="w-5 h-5 mr-3" /> },
  { view: AppView.SAVED_CODES, label: 'Kode Tersimpan', icon: <FolderOpenIcon className="w-5 h-5 mr-3" /> },
  { view: AppView.TUTORIAL, label: 'Tutorial', icon: <PlayCircleIcon className="w-5 h-5 mr-3" /> },
  { view: AppView.SETTINGS, label: 'Pengaturan', icon: <CogIcon className="w-5 h-5 mr-3" /> },
];

const Header: React.FC = () => {
  const { 
    theme, toggleTheme, 
    setCurrentView, currentView,
    conversations, activeConversationId, 
    createConversation, selectConversation,
    renameConversation, deleteConversation
  } = useContext(AppContext);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [conversationToEdit, setConversationToEdit] = useState<Conversation | null>(null);
  const [newConversationName, setNewConversationName] = useState('');


  const toggleMenu = () => {
    setIsMenuOpen(prev => !prev);
  };

  const handleNavItemClick = (view: AppView) => {
    setCurrentView(view);
    setIsMenuOpen(false);
  };

  const handleCreateNewConversation = () => {
    createConversation(); 
    setIsMenuOpen(false);
  };

  const handleSelectExistingConversation = (conversationId: string) => {
    selectConversation(conversationId); 
    setIsMenuOpen(false);
  };

  const handleViewAllConversations = () => {
    setCurrentView(AppView.CHAT); // Switch to ChatView
    // The ConversationList component within ChatView will show all conversations.
    // We might need a way to tell ChatView to ensure its own list is open if it's not by default.
    // For now, this just changes the view.
    setIsMenuOpen(false);
  }

  // Rename Modal Logic
  const handleOpenRenameModal = (conv: Conversation) => {
    setConversationToEdit(conv);
    setNewConversationName(conv.name);
    setIsRenameModalOpen(true);
  };

  const handleRenameSubmit = () => {
    if (conversationToEdit && newConversationName.trim()) {
      renameConversation(conversationToEdit.id, newConversationName.trim());
    }
    setIsRenameModalOpen(false);
    setConversationToEdit(null);
    // No need to close main menu, modal is separate
  };

  // Delete Modal Logic
  const handleOpenDeleteModal = (conv: Conversation) => {
    setConversationToEdit(conv);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (conversationToEdit) {
      deleteConversation(conversationToEdit.id);
      // If the deleted conversation was the one being viewed or the list becomes empty,
      // `deleteConversation` in AppContext handles selecting a new active one or creating one.
    }
    setIsDeleteModalOpen(false);
    setConversationToEdit(null);
    // Potentially close main menu if context changes drastically (e.g. no convs left)
    // setIsMenuOpen(false); // Consider if needed based on context's behavior
  };


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) && !(event.target as HTMLElement).closest('[aria-label="Buka menu navigasi"]')) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const recentConversations = [...conversations]
    .sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, MAX_RECENT_CONVERSATIONS_IN_NAV_MENU);

  return (
    <>
      <header className="bg-primary dark:bg-bgDarkLighter shadow-md p-3 sm:p-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center space-x-2">
          <div className="relative" ref={menuRef}>
            <button
              onClick={toggleMenu}
              className="p-1.5 sm:p-2 rounded-full text-white dark:text-primary-light hover:bg-primary-dark dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-primary-dark dark:focus:ring-offset-gray-700 focus:ring-white"
              aria-label="Buka menu navigasi"
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? <XIcon className="w-5 h-5 sm:w-6 sm:h-6" /> : <MenuIcon className="w-5 h-5 sm:w-6 sm:h-6" />}
            </button>
            {isMenuOpen && (
              <div className="absolute left-0 mt-2 w-72 sm:w-80 bg-white dark:bg-bgDarkLighter rounded-md shadow-lg py-1 z-50 border border-gray-200 dark:border-gray-700 max-h-[calc(100vh-80px)] overflow-y-auto">
                {/* Conversation Section */}
                <div className="px-2 py-2">
                  <button
                    onClick={handleCreateNewConversation}
                    className="w-full text-left px-3 py-2.5 text-sm flex items-center font-medium text-primary dark:text-primary-light hover:bg-primary/10 dark:hover:bg-primary-light/10 rounded-md"
                  >
                    <PlusIcon className="w-5 h-5 mr-3" />
                    Obrolan Baru
                  </button>
                </div>
                
                {recentConversations.length > 0 && <div className="border-t border-gray-200 dark:border-gray-600 my-1 mx-2"></div>}

                {recentConversations.map((conv) => (
                  <div 
                    key={conv.id} 
                    className="group flex items-center justify-between rounded-md mx-2 mb-0.5 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <button
                      onClick={() => handleSelectExistingConversation(conv.id)}
                      className={`flex-grow text-left pl-3 pr-1 py-2 text-sm flex items-center truncate
                        ${currentView === AppView.CHAT && activeConversationId === conv.id
                          ? 'bg-primary/5 text-primary dark:bg-primary-light/5 dark:text-primary-light font-semibold' 
                          : 'text-textLight dark:text-textDark'
                        } rounded-l-md`} // Apply rounding only to the left part of the button
                        title={conv.name}
                    >
                      <ChatBubbleOvalLeftEllipsisIcon className="w-5 h-5 mr-3 flex-shrink-0" />
                      <span className="truncate">{conv.name}</span>
                    </button>
                    <div className={`flex-shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150 pr-2
                                    ${currentView === AppView.CHAT && activeConversationId === conv.id ? 'opacity-100' : ''}
                                    ${(currentView === AppView.CHAT && activeConversationId === conv.id && (isRenameModalOpen || isDeleteModalOpen) && conversationToEdit?.id === conv.id) ? 'opacity-100' : ''}
                                  `}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleOpenRenameModal(conv); }}
                        className="p-1 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                        aria-label={`Ganti nama obrolan ${conv.name}`} title="Ganti Nama"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleOpenDeleteModal(conv); }}
                        className="p-1 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                        aria-label={`Hapus obrolan ${conv.name}`} title="Hapus"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {conversations.length > MAX_RECENT_CONVERSATIONS_IN_NAV_MENU && (
                  <button
                    onClick={handleViewAllConversations}
                    className="w-full text-left px-3 py-2.5 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md mx-2 mt-1"
                  >
                    Lihat Semua Obrolan ({conversations.length})...
                  </button>
                )}

                {/* App Views Section */}
                <div className="border-t border-gray-200 dark:border-gray-600 my-1 mx-2"></div>
                {appNavItems.map((item) => (
                  <button
                    key={item.view}
                    onClick={() => handleNavItemClick(item.view)}
                    className={`w-full text-left px-3 py-2.5 text-sm flex items-center
                      ${currentView === item.view 
                        ? 'bg-primary/10 text-primary dark:bg-primary-light/10 dark:text-primary-light font-medium' 
                        : 'text-textLight dark:text-textDark hover:bg-gray-100 dark:hover:bg-gray-700'
                      } rounded-md mx-2 mb-0.5`}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <LogoIcon className="w-7 h-7 sm:w-8 sm:h-8 text-white dark:text-primary-light" />
          <h1 className="text-lg sm:text-xl font-bold text-white dark:text-primary-light tracking-tight">{APP_NAME}</h1>
        </div>

        <div className="flex items-center">
          <button
            onClick={toggleTheme}
            className="p-1.5 sm:p-2 rounded-full text-white dark:text-primary-light hover:bg-primary-dark dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-primary-dark dark:focus:ring-offset-gray-700 focus:ring-white"
            aria-label={theme === 'light' ? 'Ganti ke mode gelap' : 'Ganti ke mode terang'}
          >
            {theme === 'light' ? <MoonIcon className="w-5 h-5 sm:w-6 sm:h-6" /> : <SunIcon className="w-5 h-5 sm:w-6 sm:h-6" />}
          </button>
        </div>
      </header>

      {/* Rename Modal */}
      <Modal isOpen={isRenameModalOpen} onClose={() => setIsRenameModalOpen(false)} title="Ganti Nama Obrolan">
        <Input
          label="Nama Obrolan Baru"
          value={newConversationName}
          onChange={(e) => setNewConversationName(e.target.value)}
          placeholder="Masukkan nama baru"
          wrapperClassName="mb-1"
          onKeyDown={(e) => e.key === 'Enter' && handleRenameSubmit()}
        />
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setIsRenameModalOpen(false)}>Batal</Button>
          <Button onClick={handleRenameSubmit}>Simpan</Button>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Konfirmasi Hapus Obrolan">
        <p>Apakah Anda yakin ingin menghapus obrolan <span className="font-semibold">"{conversationToEdit?.name}"</span>?</p>
        <p className="text-sm text-red-600 dark:text-red-400 mt-1">Tindakan ini tidak dapat diurungkan.</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>Batal</Button>
          <Button variant="danger" onClick={handleDeleteConfirm}>Hapus</Button>
        </div>
      </Modal>
    </>
  );
};

export default Header;
