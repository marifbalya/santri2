
import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../../contexts/AppContext';
import { Conversation } from '../../types';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import { PlusIcon, PencilIcon, TrashIcon, XIcon, ChatBubbleOvalLeftEllipsisIcon } from '../ui/Icons';

interface ConversationListProps {
  isOpen: boolean;
  onClose: () => void;
}

const ConversationList: React.FC<ConversationListProps> = ({ isOpen, onClose }) => {
  const { 
    conversations, 
    activeConversationId, 
    createConversation, 
    selectConversation, 
    renameConversation, 
    deleteConversation 
  } = useContext(AppContext);

  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [conversationToEdit, setConversationToEdit] = useState<Conversation | null>(null);
  const [newConversationName, setNewConversationName] = useState('');

  const handleOpenRenameModal = (conv: Conversation) => {
    setConversationToEdit(conv);
    setNewConversationName(conv.name);
    setIsRenameModalOpen(true);
  };

  const handleRename = () => {
    if (conversationToEdit && newConversationName.trim()) {
      renameConversation(conversationToEdit.id, newConversationName.trim());
    }
    setIsRenameModalOpen(false);
    setConversationToEdit(null);
  };

  const handleOpenDeleteModal = (conv: Conversation) => {
    setConversationToEdit(conv);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = () => {
    if (conversationToEdit) {
      deleteConversation(conversationToEdit.id);
    }
    setIsDeleteModalOpen(false);
    setConversationToEdit(null);
    onClose(); // Close sidebar if the active conversation might have changed
  };

  const sortedConversations = [...conversations].sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const listContent = (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-textLight dark:text-textDark flex items-center">
            <ChatBubbleOvalLeftEllipsisIcon className="w-6 h-6 mr-2 text-primary dark:text-primary-light"/>
            Obrolan
        </h2>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onClose} 
          className="md:hidden p-1.5" // Only show close on mobile drawer
          aria-label="Tutup daftar obrolan"
        >
          <XIcon className="w-5 h-5"/>
        </Button>
      </div>
      <div className="p-3">
        <Button 
          variant="primary" 
          onClick={() => { createConversation(); onClose(); }} 
          className="w-full"
          leftIcon={<PlusIcon className="w-4 h-4"/>}
        >
          Obrolan Baru
        </Button>
      </div>
      <div className="flex-grow overflow-y-auto px-2 space-y-1 pb-2">
        {sortedConversations.map((conv) => (
          <div 
            key={conv.id} 
            className={`p-2.5 rounded-md cursor-pointer group hover:bg-gray-100 dark:hover:bg-gray-700
                        ${conv.id === activeConversationId ? 'bg-primary/10 dark:bg-primary-light/10 text-primary dark:text-primary-light font-medium' : 'text-textLight dark:text-textDark'}`}
            onClick={() => { selectConversation(conv.id); onClose(); }}
            title={conv.name}
          >
            <div className="flex justify-between items-center">
              <span className="text-sm truncate flex-grow mr-2">{conv.name}</span>
              <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150 flex-shrink-0">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={(e) => { e.stopPropagation(); handleOpenRenameModal(conv); }} 
                  className="p-1 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                  aria-label={`Ganti nama ${conv.name}`}
                  title="Ganti Nama"
                >
                  <PencilIcon className="w-4 h-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={(e) => { e.stopPropagation(); handleOpenDeleteModal(conv); }} 
                  className="p-1 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                  aria-label={`Hapus ${conv.name}`}
                  title="Hapus"
                >
                  <TrashIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {new Date(conv.updatedAt).toLocaleDateString('id-ID', {day:'2-digit', month:'short'})}, {new Date(conv.updatedAt).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}
            </div>
          </div>
        ))}
        {sortedConversations.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Belum ada obrolan.</p>
        )}
      </div>

      {/* Rename Modal */}
      <Modal isOpen={isRenameModalOpen} onClose={() => setIsRenameModalOpen(false)} title="Ganti Nama Obrolan">
        <Input
          label="Nama Obrolan Baru"
          value={newConversationName}
          onChange={(e) => setNewConversationName(e.target.value)}
          placeholder="Masukkan nama baru"
          wrapperClassName="mb-1"
        />
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setIsRenameModalOpen(false)}>Batal</Button>
          <Button onClick={handleRename}>Simpan</Button>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Konfirmasi Hapus">
        <p>Apakah Anda yakin ingin menghapus obrolan "{conversationToEdit?.name}"?</p>
        <p className="text-sm text-red-600 dark:text-red-400 mt-1">Tindakan ini tidak dapat diurungkan.</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>Batal</Button>
          <Button variant="danger" onClick={handleDelete}>Hapus</Button>
        </div>
      </Modal>
    </div>
  );

  // Desktop: Always visible sidebar
  // Mobile: Drawer controlled by isOpen prop
  return (
    <>
      {/* Mobile Drawer */}
      <div className={`fixed inset-0 z-[55] md:hidden transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} aria-hidden="true"></div>
        <div className={`relative w-4/5 max-w-xs h-full shadow-xl transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          {listContent}
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:block md:w-64 lg:w-72 xl:w-80 flex-shrink-0 h-full z-30"> {/* Ensure z-index is lower than mobile drawer's overlay */}
        {listContent}
      </div>
    </>
  );
};

export default ConversationList;