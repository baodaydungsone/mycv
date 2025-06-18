
import React from 'react';
import Modal from '../Modal';
import Button from '../Button';

interface DeathConfirmationModalProps {
  onClose: () => void;
  onReincarnate: () => void;
}

const DeathConfirmationModal: React.FC<DeathConfirmationModalProps> = ({ onClose, onReincarnate }) => {
  return (
    <Modal isOpen={true} onClose={onClose} title="Thân Tử Đạo Tiêu" size="md">
      <div className="text-center py-4">
        <i className="fas fa-skull-crossbones text-6xl text-red-500 dark:text-red-400 mb-6 animate-pulse"></i>
        <h4 className="text-2xl font-bold text-text-light dark:text-text-dark mb-3">
          Ngươi đã kết thúc hành trình tại đây.
        </h4>
        <p className="text-md text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
          Thân xác tan biến, hồn phách phiêu tán nơi cửu tuyền. Liệu có muốn nắm bắt một tia hy vọng, bắt đầu một kiếp luân hồi mới, viết nên một trang sử khác không?
        </p>
      </div>
      <div className="mt-6 flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4">
        <Button variant="outline" onClick={onClose} size="lg" className="w-full sm:w-auto border-slate-400 text-slate-600 hover:bg-slate-100 dark:border-slate-500 dark:text-slate-300 dark:hover:bg-slate-700">
          <i className="fas fa-bed mr-2"></i>An Nghỉ Cõi Âm Ty
        </Button>
        <Button variant="primary" onClick={onReincarnate} size="lg" className="w-full sm:w-auto bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700">
          <i className="fas fa-sync-alt mr-2"></i>Bắt Đầu Luân Hồi
        </Button>
      </div>
    </Modal>
  );
};

export default DeathConfirmationModal;
