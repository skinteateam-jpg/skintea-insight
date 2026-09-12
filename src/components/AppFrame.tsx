import DesktopNav from "@/components/DesktopNav";

export default function AppFrame({
  children,
  fluid,
}: {
  children: React.ReactNode;
  fluid?: boolean;
}) {
  if (fluid) {
    return (
      <>
        <DesktopNav />
        <div className="min-h-screen bg-background">
          <div className="mx-auto w-full max-w-[1280px] px-4 md:px-8">
            {children}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <DesktopNav />
      <div className="md:bg-[#EDEAE2] md:min-h-screen md:py-10 md:flex md:justify-center">
        <div className="md:w-[390px] md:rounded-[18px] md:overflow-hidden md:shadow-[0_8px_28px_rgba(28,10,0,0.14)] md:border md:border-[#E8DDD4]">
          {children}
        </div>
      </div>
    </>
  );
}
