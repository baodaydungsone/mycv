
import React from 'react';
import Modal from '../Modal';
import Button from '../Button';
import { GEMINI_API_KEY_URL } from '../../constants'; 

interface GuideModalProps {
  onClose: () => void;
}

const GuideSection: React.FC<{ title: string; icon: string; children: React.ReactNode }> = ({ title, icon, children }) => (
  <section className="py-3">
    <h4 className="font-semibold text-xl lg:text-2xl border-b border-border-light dark:border-border-dark pb-2 mb-4 text-primary dark:text-primary-light flex items-center">
      <i className={`${icon} mr-3 text-2xl opacity-80`}></i>{title}
    </h4>
    <div className="space-y-3 prose prose-sm sm:prose-base dark:prose-invert max-w-none text-text-light dark:text-text-dark leading-relaxed">
        {children}
    </div>
  </section>
);


const GuideModal: React.FC<GuideModalProps> = ({ onClose }) => {
  return (
    <Modal isOpen={true} onClose={onClose} title="Hướng Dẫn Sử Dụng Nhập Vai A.I Simulator" size="2xl" containerClass="custom-scrollbar">
      <div className="space-y-6">
        <p className="text-lg text-center text-slate-700 dark:text-slate-300">
            Chào mừng bạn đến với <strong>Nhập Vai A.I Simulator</strong>! Hãy cùng khám phá cách tạo nên những cuộc phiêu lưu kỳ thú không giới hạn:
        </p>

        <GuideSection title="1. Chuẩn Bị API Key (Rất Quan Trọng!)" icon="fas fa-key">
          <p>Để AI có thể "thổi hồn" vào câu chuyện, bạn cần một API Key từ Google Gemini.</p>
          <ul className="list-disc list-inside ml-2 space-y-2">
            <li>Trên trang chủ, chọn <strong className="text-secondary dark:text-secondary-light">"Thiết Lập API Key"</strong>.</li>
            <li>
                <strong>Lựa chọn tốt nhất cho người mới:</strong> Đánh dấu vào ô <strong className="text-green-600 dark:text-green-400">"Sử dụng API Key mặc định của ứng dụng"</strong>. Tùy chọn này sử dụng mô hình Gemini Flash mạnh mẽ và không giới hạn, do ứng dụng cung cấp. Nhấn "Lưu & Đóng".
            </li>
            <li>
                <strong>Nếu bạn có API Key riêng:</strong> Bỏ chọn ô mặc định, dán Key của bạn vào ô nhập liệu và nhấn <strong className="text-blue-600 dark:text-blue-400">"Kiểm tra & Lưu Key"</strong>. Bạn có thể lấy Key tại <a href={GEMINI_API_KEY_URL} target="_blank" rel="noopener noreferrer" className="text-secondary dark:text-secondary-light hover:underline font-medium">Google AI Studio</a>.
            </li>
            <li>Key hợp lệ sẽ được lưu, và bạn đã sẵn sàng!</li>
          </ul>
        </GuideSection>

        <GuideSection title="2. Khởi Tạo Cuộc Phiêu Lưu Mới" icon="fas fa-feather-alt">
          <p>Chọn <strong className="text-secondary dark:text-secondary-light">"Bắt Đầu Khởi Tạo Mới"</strong> trên trang chủ. Bạn sẽ thấy 3 cách chính để bắt đầu:</p>
          <div className="space-y-4 pl-2">
            <div>
                <h5 className="font-semibold text-lg text-purple-600 dark:text-purple-400 flex items-center"><i className="fas fa-dice-d20 mr-2 opacity-80"></i>A.I Khởi Tạo Ngẫu Nhiên (Nhanh & Đồ Sộ)</h5>
                <ul className="list-disc list-inside ml-5 space-y-1.5 mt-1">
                    <li>Nhập một <code className="font-mono bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded-md text-sm">Chủ đề gợi ý</code> (ví dụ: "Tiên hiệp báo thù", "Võng du dị giới").</li>
                    <li>Thêm một <code className="font-mono bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded-md text-sm">Mô tả ngắn</code> về ý tưởng chính của bạn (tùy chọn).</li>
                    <li>Chọn <code className="font-mono bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded-md text-sm">Số lượng thực thể</code> AI cần tạo (NPC, địa điểm, vật phẩm...).</li>
                    <li>Nhấn <strong className="text-blue-600 dark:text-blue-400">"Để AI Khởi Tạo Toàn Bộ Thế Giới"</strong>. AI sẽ tạo ra một thiết lập truyện CỰC KỲ chi tiết, đồ sộ với thế giới quan rộng lớn.</li>
                    <li>Sau khi AI hoàn tất, hệ thống sẽ tự chuyển bạn sang tab "Thiết Lập Thủ Công & Tinh Chỉnh" để bạn xem lại và sửa đổi nếu muốn.</li>
                </ul>
            </div>
            <div>
                <h5 className="font-semibold text-lg text-orange-600 dark:text-orange-400 flex items-center"><i className="fas fa-wand-magic-sparkles mr-2 opacity-80"></i>AI Trích Xuất Từ Văn Bản (Linh Hoạt)</h5>
                 <ul className="list-disc list-inside ml-5 space-y-1.5 mt-1">
                    <li>Dán hoặc viết một đoạn văn mô tả ý tưởng tổng thể về thế giới, nhân vật, và các yếu tố ban đầu vào ô lớn.</li>
                    <li>Nhấn nút <strong className="text-blue-600 dark:text-blue-400">"Để AI Trích Xuất Thiết Lập Từ Mô Tả Trên"</strong>. AI sẽ cố gắng điền các mục trong tab "Thiết Lập Thủ Công & Tinh Chỉnh".</li>
                    <li>Kiểm tra và chỉnh sửa lại theo ý bạn trong tab "Thiết Lập Thủ Công & Tinh Chỉnh".</li>
                </ul>
            </div>
            <div>
                 <h5 className="font-semibold text-lg text-teal-600 dark:text-teal-400 flex items-center"><i className="fas fa-tools mr-2 opacity-80"></i>Thiết Lập Thủ Công & Tinh Chỉnh (Toàn Quyền Kiểm Soát)</h5>
                <ul className="list-disc list-inside ml-5 space-y-1.5 mt-1">
                    <li>Đây là nơi bạn có thể tự tay xây dựng từng chi tiết hoặc tinh chỉnh những gì AI đã tạo.</li>
                    <li><strong>Bước 1: Thiết Lập Thế Giới:</strong> Nhập <em>Chủ đề, Bối cảnh, Phong cách</em>. Sử dụng nút <strong className="text-blue-500">AI</strong> bên cạnh mỗi trường để AI gợi ý nếu bạn bí ý tưởng. <em>Prompt Nâng Cao</em> cho phép bạn thêm các quy tắc, lịch sử, hoặc đặc điểm riêng của thế giới.</li>
                    <li><strong>Bước 2: Thiết Lập Nhân Vật Chính:</strong> Tương tự, nhập <em>Tên, Giới tính, Sơ lược, Đặc điểm, Mục tiêu</em>. Nút <strong className="text-blue-500">AI</strong> cũng có sẵn.</li>
                    <li><strong>Bước 3: Thực Thể & Kỹ Năng Ban Đầu (Tùy chọn):</strong> Thêm NPC, vật phẩm, địa điểm, hoặc kỹ năng khởi đầu để làm phong phú thêm cho câu chuyện. Bạn có thể thêm thủ công hoặc dùng AI gợi ý.</li>
                 </ul>
            </div>
          </div>
          <p className="mt-3 pl-2">Sau khi hoàn tất thiết lập (dù bằng cách nào), đặt <strong>Tên Cuộc Phiêu Lưu</strong> (ví dụ: "Hành Trình Tu Tiên Của A") và nhấn <strong className="text-green-600 dark:text-green-400">"Khởi Tạo Cuộc Phiêu Lưu"</strong>. AI sẽ cần một chút thời gian để tạo ra những dòng truyện đầu tiên.</p>
        </GuideSection>

        <GuideSection title="3. Trong Game - Khám Phá & Tương Tác" icon="fas fa-gamepad">
          <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
            <div>
              <h5 className="font-semibold text-lg mb-1.5 flex items-center"><i className="fas fa-scroll mr-2 opacity-70"></i>Khu Vực Chính (Bên Trái):</h5>
              <ul className="list-disc list-inside ml-2 space-y-1.5">
                <li><strong>Nội Dung Truyện:</strong> AI sẽ kể chuyện, mô tả bối cảnh, hành động NPC tại đây. Các loại tin nhắn (hệ thống, lời thoại, tường thuật) sẽ có màu sắc và định dạng khác nhau để dễ phân biệt.</li>
                <li><strong>Tương tác với từ khóa (Tooltips):</strong> Di chuột (hoặc chạm và giữ trên di động, hoặc dùng phím <kbd>Tab</kbd> để focus và <kbd>Enter</kbd>/<kbd>Space</kbd>) vào các từ được <strong className="text-primary dark:text-primary-light">đánh dấu màu</strong> (ví dụ: <span className="text-teal-600 dark:text-teal-400 font-semibold">[NPC:Tên NPC]</span>, <span className="text-orange-600 dark:text-orange-400 font-semibold">[ITEM:Tên Vật Phẩm]</span>) để xem thông tin chi tiết nhanh chóng. Tooltip sẽ tự động ẩn khi bạn cuộn hoặc di chuột ra ngoài.</li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold text-lg mb-1.5 flex items-center"><i className="fas fa-columns mr-2 opacity-70"></i>Bảng Điều Khiển (Bên Phải):</h5>
              <ul className="list-disc list-inside ml-2 space-y-1.5">
                <li><strong>Tab "Hành Động":</strong>
                    <ul className="list-disc list-inside ml-4 space-y-1 mt-1">
                        <li>Chọn một trong các <em>Lựa Chọn Do AI Tạo</em> (nút bấm). Di chuột qua để xem giải thích thêm nếu có.</li>
                        <li>Hoặc, <em>Nhập Hành Động Tùy Chỉnh</em> của bạn vào ô văn bản và nhấn "Gửi" (hoặc Enter).</li>
                    </ul>
                </li>
                <li><strong>Các Tab Khác:</strong> <em>Chỉ Số, Trang Bị, Ba Lô, Tu Luyện, Kỹ Năng, Thành Tựu, Quan Hệ</em> giúp bạn theo dõi và quản lý nhân vật. Nội dung ở đây sẽ tự động cập nhật dựa trên diễn biến truyện và hành động của bạn.</li>
              </ul>
            </div>
          </div>
           <h5 className="font-semibold text-lg mb-1.5 mt-4 flex items-center"><i className="fas fa-bars mr-2 opacity-70"></i>Thanh Menu Điều Khiển (Phía trên cùng):</h5>
            <ul className="list-disc list-inside ml-2 space-y-1.5">
                <li><strong>Nút Chế độ <i className="fas fa-theater-masks"></i> Nhập Vai/<i className="fas fa-brain"></i> AI Hỗ Trợ:</strong> Chuyển đổi giữa việc bạn tự do nhập hành động hoặc AI đưa ra lựa chọn. Trong chế độ Nhập Vai, AI sẽ không tạo lựa chọn.</li>
                <li><strong><i className="fas fa-save"></i> Lưu:</strong> Lưu tiến trình game hiện tại ra file JSON trên máy của bạn.</li>
                <li><strong><i className="fas fa-book-open"></i> B.Khoa:</strong> Mở Bách Khoa Toàn Thư, nơi lưu trữ thông tin về các NPC, vật phẩm, địa điểm... bạn đã khám phá. Thông tin này được AI tự động cập nhật.</li>
                <li><strong><i className="fas fa-scroll"></i> T.Tắt:</strong> Xem lại tóm tắt cốt truyện do AI tạo. Bạn có thể yêu cầu AI làm mới tóm tắt.</li>
                <li><strong><i className="fas fa-meteor"></i> S.Kiện:</strong> Tự tạo hoặc để AI tạo một sự kiện thế giới mới (ví dụ: kỳ ngộ, tai họa) để làm phong phú thêm câu chuyện.</li>
                <li><strong><i className="fas fa-undo"></i> H.Tác:</strong> Quay lại hành động trước đó (giới hạn 10 lần, hữu ích khi chọn nhầm hoặc muốn thử hướng khác).</li>
                <li><strong><i className="fas fa-door-open"></i> Thoát:</strong> Kết thúc phiên chơi hiện tại và quay về trang chủ.</li>
            </ul>
        </GuideSection>

        <GuideSection title="4. Các Chức Năng Khác Trên Trang Chủ" icon="fas fa-home">
          <ul className="list-disc list-inside ml-2 space-y-1.5">
            <li><strong><i className="fas fa-upload mr-1"></i> Tải Truyện Đã Lưu:</strong> Tiếp tục các cuộc phiêu lưu từ file .json đã lưu.</li>
            <li><strong><i className="fas fa-fire-alt mr-1"></i> Chế Độ NSFW:</strong> Tùy chỉnh mức độ nội dung người lớn (sử dụng có trách nhiệm và theo quy định của Google Gemini).</li>
            <li><strong><i className="fas fa-cogs mr-1"></i> Cài Đặt Chung:</strong> Thay đổi giao diện Sáng/Tối, kích thước chữ.</li>
          </ul>
        </GuideSection>
        
        <GuideSection title="Mẹo Nhỏ Cho Đại Hiệp" icon="fas fa-lightbulb">
          <ul className="list-disc list-inside ml-2 space-y-1.5">
            <li><strong>Sáng tạo không giới hạn:</strong> Đừng ngại thử những hành động "điên rồ" hoặc khác biệt. AI rất giỏi trong việc ứng biến!</li>
            <li><strong>Mô tả chi tiết:</strong> Khi nhập hành động tùy chỉnh, càng chi tiết, AI càng dễ hiểu và phản hồi tốt hơn.</li>
            <li><strong>Nếu AI "bí" hoặc lặp lại:</strong> Thử một hành động khác, đơn giản hơn, hoặc dùng chức năng "Hoàn Tác" và chọn một lựa chọn khác. Đôi khi, việc tạo một "Sự Kiện Thế Giới" mới cũng có thể giúp thay đổi mạch truyện.</li>
            <li><strong>Khám phá các tab:</strong> Thường xuyên kiểm tra chỉ số, vật phẩm, kỹ năng để đưa ra quyết định tốt nhất. Các chỉ số này thực sự ảnh hưởng đến cách AI xây dựng câu chuyện và kết quả hành động của bạn.</li>
            <li><strong>Lưu game thường xuyên:</strong> Đặc biệt là trước những quyết định quan trọng!</li>
          </ul>
        </GuideSection>

        <p className="mt-8 text-center text-lg font-semibold text-primary dark:text-primary-light">
            Chúc bạn có những cuộc phiêu lưu nhập vai đầy kỳ thú và sảng văn!
        </p>
      </div>
      <div className="mt-8 flex justify-end">
        <Button onClick={onClose} size="lg" variant="primary" className="px-8 py-3">
            <i className="fas fa-play-circle mr-2"></i>Đã Hiểu, Bắt Đầu Thôi!
        </Button>
      </div>
    </Modal>
  );
};

export default GuideModal;
