import { notFound } from "next/navigation";
import { getProductByCode } from "../../../lib/products";
import TopupForm from "../../../components/TopupForm";

export default async function TopupPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const product: any = await getProductByCode(code);
  if (!product) return notFound();

  return (
    <main>
  <div className="max-w-md mx-auto px-4 pt-8 pb-28 mt-2">
        <div className="flex flex-col items-center mb-5">
          <img
            src={product.icon || '/images/logo/gimbox.gif'}
            alt={product.name}
            className="w-20 h-20 rounded-2xl object-cover object-center"
          />
          <div className="font-semibold text-lg mt-3 text-slate-900">{product.name}</div>
        </div>
        {/* If variants exist, pass them to the form so user can pick a package */}
        <TopupForm
          code={product.code}
          price={product?.variants?.find((v: any) => (v.isActive ?? true) !== false)?.price || 10000}
          variants={Array.isArray(product?.variants) ? product.variants : undefined}
        />
      </div>
    </main>
  );
}
