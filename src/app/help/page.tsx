import { Panel, SectionHeader } from "@/components/ui";

const topics = [
  {
    title: "Git이 무엇인가요?",
    body: "Git은 프로젝트 파일의 변경 이력을 관리하는 도구입니다. 어떤 파일이 바뀌었는지 확인하고, 필요할 때 이전 상태로 되돌릴 수 있게 돕습니다."
  },
  {
    title: "변경 파일이 무엇인가요?",
    body: "마지막 저장된 Git 상태와 비교했을 때 내용이 달라진 파일입니다. 수정된 파일, 삭제된 파일, 새로 생긴 파일이 여기에 포함됩니다."
  },
  {
    title: "유지와 되돌리기의 차이",
    body: "유지는 현재 변경을 남기겠다는 뜻입니다. 되돌리기 예정은 내용을 확인한 뒤 Git이 알고 있는 이전 상태로 되돌릴 후보로 표시하는 뜻입니다."
  },
  {
    title: "추적되지 않은 파일이란?",
    body: "Git이 아직 관리 대상으로 삼지 않은 새 파일입니다. 앱은 이런 파일을 자동 삭제하지 않습니다. 파일 탐색기나 에디터에서 직접 확인한 뒤 삭제 여부를 결정하세요."
  },
  {
    title: "왜 새 파일을 자동 삭제하지 않나요?",
    body: "새 파일은 Git 안에 이전 내용이 없을 수 있습니다. 자동으로 지우면 복구하기 어려울 수 있으므로 MVP에서는 안전하게 안내만 제공합니다."
  },
  {
    title: "되돌리기 전에 왜 백업해야 하나요?",
    body: "커밋하지 않은 변경은 되돌린 뒤 다시 살리기 어려울 수 있습니다. 중요한 프로젝트라면 폴더를 복사하거나 커밋을 만든 뒤 진행하세요."
  },
  {
    title: "Windows에서 프로젝트 경로 복사하기",
    body: "파일 탐색기에서 프로젝트 폴더를 열고 주소 표시줄을 클릭하면 전체 경로가 보입니다. 그 경로를 복사해 첫 화면 입력창에 붙여넣으면 됩니다."
  }
];

export default function HelpPage() {
  return (
    <div>
      <SectionHeader
        title="사용 방법"
        description="이 앱은 사용자의 프로젝트 폴더에서 Git 상태를 읽고, 사용자가 선택한 일부 추적 파일만 되돌립니다."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {topics.map((topic) => (
          <Panel key={topic.title}>
            <h3 className="text-base font-bold text-slate-950">{topic.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-700">{topic.body}</p>
          </Panel>
        ))}
      </div>
      <Panel className="mt-5 border-red-200 bg-red-50">
        <h3 className="text-base font-bold text-red-900">안전 원칙</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-red-800">
          <li>폴더 전체 되돌리기와 대량 삭제 명령은 사용하지 않습니다.</li>
          <li>체크리스트를 모두 확인하지 않으면 되돌리기 버튼이 활성화되지 않습니다.</li>
          <li>파일을 확인한 뒤 상태가 다시 바뀌면 되돌리기를 중단합니다.</li>
          <li>프로젝트 폴더 밖의 파일 경로는 조작하지 않습니다.</li>
        </ul>
      </Panel>
    </div>
  );
}
