import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import sendIcon from "../component/images/send.png";
import { useLocation, useNavigate } from "react-router-dom";

const KEYBOARD_THRESHOLD = 150;

const ChatbotPage: React.FC = () => {
  const navigate = useNavigate();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [kbOpen, setKbOpen] = useState(false);
  const location = useLocation();
  const tripData = location.state?.tripData;

  // ✅ localStorage에 기본 여행 데이터 자동 등록
  useEffect(() => {
    const stored = localStorage.getItem("trips");
    if (!stored || stored === "[]") {
      import("../component/data/dummyTrips").then(({ defaultTrips }) => {
        console.log("💾 기본 여행 데이터를 로컬스토리지에 등록합니다");
        localStorage.setItem("trips", JSON.stringify(defaultTrips));
      });
    }
  }, []);

  // ✅ 키보드 열림 감지 (모바일 대응)
  useEffect(() => {
    const vv = (window as any).visualViewport as VisualViewport | undefined;
    if (!vv) return;

    const onResize = () => {
      const delta = window.innerHeight - vv.height;
      const isKeyboard = delta > KEYBOARD_THRESHOLD;
      setKbOpen(isKeyboard);
      requestAnimationFrame(() =>
        bottomRef.current?.scrollIntoView({ block: "end" })
      );
    };

    vv.addEventListener("resize", onResize);
    vv.addEventListener("scroll", onResize);
    onResize();

    return () => {
      vv.removeEventListener("resize", onResize);
      vv.removeEventListener("scroll", onResize);
    };
  }, []);

  // ✅ 추천 항목을 여행 일정에 추가
  const handleAddRecommendation = (item: any) => {
  if (!tripData) {
    alert("여행 정보가 없습니다.");
    return;
  }

  // ✅ trips 불러오기
  let trips = JSON.parse(localStorage.getItem("trips") || "[]");

  // ✅ 여행 찾기
  let targetIndex = trips.findIndex(
    (t: any) =>
      Number(t.id) === Number(tripData.id) ||
      Number(t.tripNo) === Number(tripData.tripNo)
  );

    if (targetIndex === -1) {
          console.error("❌ 여행 데이터를 동기화했지만 여전히 찾을 수 없습니다.", tripData);
          alert("오류: 여행 정보를 찾을 수 없습니다. 앱을 새로고침해주세요.");
          return;
        }

  // ✅ 첫째 날 일정에 추가
  const dayKey = "1";
  const updatedTrip = {
    ...trips[targetIndex],
    schedule: {
      ...trips[targetIndex].schedule,
      [dayKey]: [
        ...(trips[targetIndex].schedule?.[dayKey] || []),
        {
          id: Date.now(),
          name: item.title,
          period: item.period,
          location: item.location,
        },
      ],
    },
  };

  // ✅ 로컬스토리지 반영
  trips[targetIndex] = updatedTrip;
  localStorage.setItem("trips", JSON.stringify(trips));

  // ✅ 바로 MyTrip으로 이동 (추가된 데이터 전달)
  navigate("/mytrip", { 
  state: { tripData: updatedTrip },
  replace: true
});

};


  // ✅ 메시지 전송 처리
  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const msg = String(fd.get("msg") || "").trim();
    if (!msg) return;
    (e.currentTarget.elements.namedItem("msg") as HTMLInputElement).value = "";
    requestAnimationFrame(() =>
      bottomRef.current?.scrollIntoView({ block: "end" })
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#F9FAFB]">
      {/* 상단 헤더 */}
      <div className="flex items-end h-[124px] px-4 border-b border-gray-200 bg-white">
        <button
          onClick={() => navigate(-1)}
          className="absolute top-10 left-4 bg-transparent p-2 rounded-full hover:bg-black/0 transition outline-none border-none"
          aria-label="뒤로 가기"
        >
          <ChevronLeft className="w-8 h-8 text-[#969696]" strokeWidth={2} />
        </button>
        <h1 className="flex-1 text-center font-semibold text-[20px] text-[#319CE5] mb-6">
          AI.Trip Mate
        </h1>
        <div className="w-4" />
      </div>

      {/* 채팅 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 사용자 말풍선 */}
        <div className="flex justify-end">
          <div
            className="relative max-w-[85%] bg-[#2D9CDB] text-white px-3.5 py-2 
                      rounded-lg text-[14px] leading-snug shadow-md text-left"
            style={{ boxShadow: "0 2px 6px rgba(0,0,0,0.15)" }}
          >
            10월 25일부터 27일까지 부산으로 여행을 가는데 친구랑 갈만한 한 팝업이나,
            전시 등을 추천해줘.
            <div
              className="absolute right-[-6px] bottom-3 w-0 h-0"
              style={{
                borderLeft: "8px solid #2D9CDB",
                borderTop: "6px solid transparent",
                borderBottom: "6px solid transparent",
              }}
            />
          </div>
        </div>

        {/* 챗봇 말풍선 */}
        <div className="flex justify-start">
          <div
            className="relative max-w-[85%] bg-[#D9D9D9] text-[#333] px-3.5 py-2 
                      rounded-lg text-[14px] leading-snug shadow-md border text-left"
            style={{ boxShadow: "0 2px 6px rgba(37,37,37,0.1)" }}
          >
            친구와 함께 방문하기 좋은 부산의 10월 후반 행사들을 몇 가지 추천해 드립니다.
            <div
              className="absolute left-[-6px] bottom-3 w-0 h-0"
              style={{
                borderRight: "8px solid #D9D9D9",
                borderTop: "6px solid transparent",
                borderBottom: "6px solid transparent",
              }}
            />
          </div>
        </div>

        {/* 추천 카드 리스트 */}
        <div className="w-[90%] bg-[#F2F2F2] rounded-xl p-2 shadow-inner">
          <div className="flex flex-col space-y-2">
            {/* 카드 1 */}
            <div className="bg-white rounded-lg w-full h-[96px] shadow-sm p-2 flex items-stretch">
              <div className="flex flex-col justify-center items-center pr-2 border-r border-gray-300 w-[50px]">
                <p className="text-[11px] font-semibold text-gray-700 text-center leading-tight">
                  전시<br />체험
                </p>
              </div>

              <div className="flex-1 flex justify-between pl-4 text-left items-center">
                <div className="flex-1">
                  <p className="text-[13px] w-[170px] break-words font-medium text-gray-900">
                    두산골관 나이트 팝업 vol.3 – &lt;광안대 용두산밤식&gt;
                  </p>
                  <p className="text-[12px] text-gray-500">
                    기간: 2025.10.15 ~ 2025.10.26
                  </p>
                  <p className="text-[12px] text-gray-500">장소: 용두산공원</p>
                </div>

                <button
                  onClick={() =>
                    handleAddRecommendation({
                      title: "두산골관 나이트 팝업 vol.3 – <광안대 용두산밤식>",
                      period: "2025.10.15 ~ 2025.10.26",
                      location: "용두산공원",
                    })
                  }
                  className="flex-shrink-0 text-[#706F6F] text-[32px] font-medium 
                            bg-transparent border-none mr-[14px] w-[20px] h-[15px] 
                            p-0 flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>

            {/* 카드 2 */}
            <div className="bg-white rounded-lg w-full h-[96px] shadow-sm p-2 flex items-stretch">
              <div className="flex flex-col justify-center items-center pr-2 border-r border-gray-300 w-[50px]">
                <p className="text-[11px] font-semibold text-gray-700 text-center leading-tight">
                  공연
                </p>
              </div>

              <div className="flex-1 flex justify-between pl-4 text-left items-center">
                <div className="flex-1">
                  <p className="text-[13px] font-medium text-gray-900 leading-snug w-[170px] break-words whitespace-normal">
                    해운대 재즈 나이트 콘서트 &lt;부산바다의 리듬&gt;
                  </p>
                  <p className="text-[12px] text-gray-500">
                    기간: 2025.10.20 ~ 2025.10.25
                  </p>
                  <p className="text-[12px] text-gray-500">장소: 해운대 문화회관</p>
                </div>

                <button
                  onClick={() =>
                    handleAddRecommendation({
                      title: "해운대 재즈 나이트 콘서트 <부산바다의 리듬>",
                      period: "2025.10.20 ~ 2025.10.25",
                      location: "해운대 문화회관",
                    })
                  }
                  className="flex-shrink-0 text-[#706F6F] text-[32px] font-medium 
                            bg-transparent border-none mr-[14px] w-[20px] h-[15px] 
                            p-0 flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <form
        onSubmit={handleSubmit}
        className="sticky bottom-8 left-0 w-full border-t bg-white px-3 pt-3"
      >
        <div className="flex items-center bg-white rounded-full shadow-sm border border-gray-300 px-4 py-2.5">
          <input
            name="msg"
            type="text"
            placeholder="Write your message"
            className="flex-1 text-[15px] text-gray-700 placeholder-gray-400 bg-transparent focus:outline-none"
            autoComplete="off"
            inputMode="text"
            onFocus={() =>
              requestAnimationFrame(() =>
                bottomRef.current?.scrollIntoView({ block: "end" })
              )
            }
          />

          <button type="submit" className="bg-transparent border-none p-0">
            <img src={sendIcon} alt="send" className="w-5 h-5 object-contain" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatbotPage;
