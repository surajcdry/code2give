import ImageUpload from "@/components/ImageUpload";

export default function UploadPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 border border-emerald-200 mb-4">
            {/* Leaf / pantry icon */}
            <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75L12 3l9 6.75V21H3V9.75z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 21V12h6v9" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
            Submit a Pantry Photo
          </h1>
          <p className="mt-2 text-gray-500 text-sm leading-relaxed max-w-sm mx-auto">
            Help us understand what resources are available. Upload a clear photo
            of pantry shelves or supplies — we'll do the rest.
          </p>
        </div>

        {/* Upload card */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
          <ImageUpload />
        </div>

        <p className="text-center text-xs text-gray-400 mt-5">
          Photos are used only to improve pantry resource visibility.
        </p>
      </div>
    </main>
  );
}