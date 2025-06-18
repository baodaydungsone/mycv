
import React, { useState, useEffect } from 'react';
import Modal from '../Modal';
import Button from '../Button';
import { Entity, EntityType } from '../../types';

interface EncyclopediaModalProps {
  onClose: () => void;
  entries: Entity[];
}

const EncyclopediaModal: React.FC<EncyclopediaModalProps> = ({ onClose, entries }) => {
  const [selectedCategory, setSelectedCategory] = useState<EntityType>(EntityType.NPC);
  const [selectedEntry, setSelectedEntry] = useState<Entity | null>(null);

  const categories: EntityType[] = [EntityType.NPC, EntityType.Item, EntityType.Location, EntityType.Organization, EntityType.Other];

  // Effect to set initial selected entry when category changes or component mounts
  useEffect(() => {
    const initialEntriesInCurrentCategory = entries.filter(entry => entry.type === selectedCategory);
    if (initialEntriesInCurrentCategory.length > 0) {
      // If there's already a selected entry and it's in the new category, keep it.
      // Otherwise, select the first one in the new category.
      if (!selectedEntry || selectedEntry.type !== selectedCategory) {
        setSelectedEntry(initialEntriesInCurrentCategory[0]);
      }
    } else {
      setSelectedEntry(null); // No entries in this category
    }
  }, [selectedCategory, entries, selectedEntry]);


  const filteredEntries = entries.filter(entry => entry.type === selectedCategory);

  const getCategoryButtonClass = (category: EntityType) => {
    const base = "px-4 py-1.5 text-xs rounded-full whitespace-nowrap transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-card-light dark:focus:ring-offset-card-dark";
    if (selectedCategory === category) {
      return `${base} bg-primary text-white dark:bg-primary-dark dark:text-card-dark shadow-md focus:ring-primary`;
    }
    return `${base} bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 focus:ring-primary/50`;
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Bách Khoa Toàn Thư" size="xl">
      <div className="flex flex-col md:flex-row gap-4 md:gap-x-6 max-h-[70vh]">
        {/* Left Panel: Categories & Entries List */}
        <div className="w-full md:w-2/5 lg:w-1/3 flex flex-col md:border-r md:border-border-light md:dark:border-border-dark md:pr-4">
          {/* Category Tabs */}
          <div className="flex flex-nowrap overflow-x-auto items-center gap-2 mb-3 pb-3 border-b border-border-light dark:border-border-dark">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={getCategoryButtonClass(category)}
              >
                {category} ({entries.filter(e => e.type === category).length})
              </button>
            ))}
          </div>

          {/* Entries List for Selected Category */}
          <div className="overflow-y-auto space-y-1.5 flex-grow pr-0.5"> {/* pr-0.5 for scrollbar space */}
            {filteredEntries.length > 0 ? (
              filteredEntries.map(entry => (
                <div
                  key={entry.id}
                  className={`p-2.5 rounded-md cursor-pointer text-sm transition-colors duration-150 break-words
                    ${selectedEntry?.id === entry.id
                      ? 'bg-primary dark:bg-primary-dark text-white dark:text-card-dark font-semibold shadow-md'
                      : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-700/60'}`}
                  onClick={() => setSelectedEntry(entry)}
                >
                  {entry.name}
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400 p-3 italic text-center">
                Không có mục nào trong danh mục "{selectedCategory}".
              </p>
            )}
          </div>
        </div>

        {/* Right Panel: Selected Entry Details */}
        <div className="w-full md:w-3/5 lg:w-2/3 flex flex-col pt-4 md:pt-0">
          {selectedEntry ? (
            <div className="overflow-y-auto h-full p-1 pr-0 text-text-light dark:text-text-dark space-y-2">
              <h3 className="text-xl sm:text-2xl font-bold text-primary dark:text-primary-light">
                {selectedEntry.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-2 pb-2 border-b border-border-light dark:border-border-dark">
                Loại: <span className="font-medium">{selectedEntry.type}</span>
              </p>
              <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none leading-relaxed text-text-light dark:text-text-dark whitespace-pre-wrap">
                {selectedEntry.description || <span className="italic">Không có mô tả chi tiết.</span>}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-4 md:p-6 text-slate-500 dark:text-slate-400">
              <i className="fas fa-book-reader fa-3x mb-4 opacity-60"></i>
              <p className="text-lg mb-1">
                {entries.length > 0 ? "Chọn một mục để xem chi tiết" : "Bách khoa toàn thư hiện đang trống."}
              </p>
              <p className="text-sm">
                {entries.length > 0 ? "Các mục sẽ được liệt kê ở bảng bên trái." : "Các thực thể sẽ xuất hiện ở đây khi được tạo trong truyện."}
              </p>
            </div>
          )}
        </div>
      </div>
      <div className="mt-6 flex justify-end border-t border-border-light dark:border-border-dark pt-4">
        <Button onClick={onClose}>Đóng</Button>
      </div>
    </Modal>
  );
};

export default EncyclopediaModal;
