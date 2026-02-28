export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="w-full max-w-md p-8 rounded-2xl shadow-2xl 
        bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700
        border border-blue-400">
        
        <h2 className="text-2xl font-bold mb-6 text-center text-white">
          Contractor Login
        </h2>

        <form className="space-y-5">
          
          <div>
            <label className="block mb-2 text-sm font-medium text-blue-200">
              Email
            </label>
            <input
              type="email"
              placeholder="you@company.com"
              className="w-full px-4 py-2 rounded-lg bg-blue-950 text-white 
                         border border-blue-500 
                         focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-blue-200">
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full px-4 py-2 rounded-lg bg-blue-950 text-white 
                         border border-blue-500 
                         focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2 mt-4 font-semibold rounded-lg 
                       bg-blue-400 text-black 
                       hover:bg-blue-300 transition"
          >
            Sign In
          </button>

        </form>
      </div>
    </div>
  );
}