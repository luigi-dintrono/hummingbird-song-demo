import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { TopPanel } from "@/components/top-panel";
import { BottomPanel } from "@/components/bottom-panel";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <main className="h-screen">
        <ResizablePanelGroup direction="vertical" className="h-full">
          <ResizablePanel defaultSize={50} minSize={30}>
            <TopPanel />
          </ResizablePanel>

          <ResizableHandle />

          <ResizablePanel defaultSize={50} minSize={30}>
            <BottomPanel />
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
    </div>
  );
}
