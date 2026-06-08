import BottomNav from "../../components/BottomNav";
export default function AiCookPage() {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto min-h-screen max-w-md bg-slate-50 pb-24">
        <header className="px-5 pt-8 pb-4">
          <p className="text-sm text-slate-500">FamilyShop</p>
          <h1 className="text-3xl font-bold">AI Cook 🤖</h1>
        </header>

        <section className="px-5">
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Скоро</h2>
            <p className="mt-2 text-sm text-slate-500">
              Здесь появятся идеи блюд из продуктов, которые есть дома.
            </p>
          </div>
        </section>

        <BottomNav current="ai" /> 
      </div>
    </main>
  );
}