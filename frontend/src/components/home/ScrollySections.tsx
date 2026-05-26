'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CloudSun, Stethoscope, LineChart, Map } from 'lucide-react';

export function ScrollySections() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // Smooth scroll progress for physics
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  // ============================
  // Section 2: The Solution (Horizontal Scroll / Overlap)
  // ============================
  const solutionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: solutionProgress } = useScroll({
    target: solutionRef,
    offset: ["start start", "end end"]
  });
  
  // Transform horizontal scroll for feature cards
  const xTransform = useTransform(solutionProgress, [0, 1], ["0%", "-66%"]);
  const progressWidth = useTransform(solutionProgress, [0, 1], ["0%", "100%"]);

  return (
    <div ref={containerRef} className="relative bg-gray-950 text-white overflow-hidden">
      
      {/* ============================
          SECTION 1: THE CHALLENGE
          ============================ */}
      <section className="min-h-screen flex items-center justify-center py-24 relative overflow-hidden">
        {/* Background decorative blob */}
        <motion.div 
          className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-red-900/20 rounded-full blur-[120px] pointer-events-none"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        
        <div className="container mx-auto px-6 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl mx-auto text-center mb-16"
          >
            <h2 className="text-5xl md:text-6xl font-bold mb-6 text-gray-100">Farming is changing.</h2>
            <p className="text-xl md:text-2xl text-gray-400">Unpredictable weather, soil degradation, and resource scarcity make traditional agriculture more challenging than ever.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              { title: "Climate Volatility", desc: "Extreme weather events disrupt crop cycles and cause devastating losses.", icon: "🌪️" },
              { title: "Soil Health", desc: "Over-farming and chemical overuse lead to nutrient-depleted soil.", icon: "🏜️" },
              { title: "Resource Waste", desc: "Inefficient irrigation and fertilization waste precious natural resources.", icon: "💧" }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.2 }}
                className="bg-gray-900/50 border border-gray-800 rounded-3xl p-8 backdrop-blur-sm"
              >
                <div className="text-5xl mb-6">{item.icon}</div>
                <h3 className="text-2xl font-bold mb-4">{item.title}</h3>
                <p className="text-gray-400 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================
          SECTION 2: THE SOLUTION (HORIZONTAL SCROLL)
          ============================ */}
      <section ref={solutionRef} className="h-[300vh] relative">
        {/* Sticky container */}
        <div className="sticky top-0 h-screen flex flex-col justify-center overflow-hidden bg-gradient-to-b from-gray-950 to-emerald-950/20">
          <div className="container mx-auto px-6 mb-12">
            <motion.h2 
              className="text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400"
              style={{ opacity: useTransform(solutionProgress, [0, 0.1, 0.9, 1], [0, 1, 1, 0]) }}
            >
              The AgroTrack Advantage
            </motion.h2>
          </div>

          {/* Horizontal scrolling track */}
          <motion.div 
            className="flex gap-8 px-6 w-[300vw] lg:w-[250vw]"
            style={{ x: xTransform }}
          >
            {[
              {
                title: "Climate Intelligence",
                desc: "Real-time AI risk forecasting mapped directly to your GPS coordinates.",
                icon: <Map className="w-12 h-12 text-emerald-400" />,
                color: "from-emerald-900/40 to-emerald-800/10",
                border: "border-emerald-500/20"
              },
              {
                title: "Plant Doctor AI",
                desc: "Upload a photo and instantly detect diseases with actionable remedies.",
                icon: <Stethoscope className="w-12 h-12 text-blue-400" />,
                color: "from-blue-900/40 to-blue-800/10",
                border: "border-blue-500/20"
              },
              {
                title: "Profit Planner",
                desc: "Calculate margins, predict yields, and track market prices effortlessly.",
                icon: <LineChart className="w-12 h-12 text-purple-400" />,
                color: "from-purple-900/40 to-purple-800/10",
                border: "border-purple-500/20"
              }
            ].map((feature, i) => (
              <div key={i} className="w-[85vw] md:w-[60vw] lg:w-[40vw] flex-shrink-0">
                <div className={`h-[50vh] rounded-3xl p-10 bg-gradient-to-br ${feature.color} border ${feature.border} backdrop-blur-md flex flex-col justify-between`}>
                  <div>
                    <div className="mb-8 p-4 bg-gray-950/50 rounded-2xl inline-block">
                      {feature.icon}
                    </div>
                    <h3 className="text-4xl font-bold mb-4">{feature.title}</h3>
                    <p className="text-xl text-gray-300 leading-relaxed max-w-lg">{feature.desc}</p>
                  </div>
                  <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden mt-8">
                    <motion.div 
                      className="h-full bg-current"
                      style={{ 
                        width: progressWidth,
                        color: feature.icon.props.className.match(/text-(\w+)-400/)?.[0] || 'inherit'
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ============================
          SECTION 3: PARALLAX STATS
          ============================ */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden py-32">
        {/* Parallax Background Image (Simulated with gradient/shapes) */}
        <motion.div 
          className="absolute inset-0 z-0 opacity-20"
          style={{ 
            y: useTransform(smoothProgress, [0, 1], ["-20%", "20%"]),
            backgroundImage: 'radial-gradient(circle at 50% 50%, #059669 2px, transparent 2px)',
            backgroundSize: '40px 40px'
          }}
        />

        <div className="container mx-auto px-6 relative z-10">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -100 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, type: "spring" }}
            >
              <h2 className="text-5xl md:text-6xl font-bold leading-tight mb-6">Data-driven decisions for modern agriculture.</h2>
              <p className="text-xl text-gray-400 mb-8">Stop guessing. Leverage satellite data, AI models, and local telemetry to maximize yield and minimize waste.</p>
            </motion.div>

            <div className="grid grid-cols-2 gap-6">
              {[
                { stat: "40%", label: "Reduction in water usage via smart irrigation" },
                { stat: "2.5x", label: "Faster disease detection with AI" },
                { stat: "95%", label: "Accuracy in localized climate risk forecasts" },
                { stat: "+20%", label: "Average yield increase per acre" }
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.15 }}
                  className="bg-gray-900 border border-gray-800 p-8 rounded-3xl"
                >
                  <h4 className="text-4xl font-black text-emerald-400 mb-4">{item.stat}</h4>
                  <p className="text-sm text-gray-400 font-medium">{item.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================
          SECTION 4: DYNAMIC CTA
          ============================ */}
      <section className="min-h-[80vh] flex items-center justify-center relative py-20">
        <motion.div 
          className="absolute inset-0 bg-gradient-to-t from-emerald-900/40 to-transparent pointer-events-none"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 1 }}
        />
        
        <motion.div 
          className="text-center relative z-10 px-6"
          initial={{ opacity: 0, scale: 0.8, y: 50 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
        >
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-emerald-500/20 mb-8 ring-4 ring-emerald-500/10">
            <CloudSun className="w-12 h-12 text-emerald-400" />
          </div>
          <h2 className="text-6xl md:text-7xl font-black tracking-tight mb-8">Ready to evolve?</h2>
          <p className="text-2xl text-gray-400 mb-12 max-w-2xl mx-auto">
            Join the agricultural revolution. Access all farming tools, AI insights, and resources today.
          </p>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button asChild size="lg" className="h-16 px-10 text-xl rounded-full bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold shadow-[0_0_40px_rgba(16,185,129,0.4)] hover:shadow-[0_0_60px_rgba(16,185,129,0.6)] transition-all duration-300">
              <Link href="/dashboard">
                Launch Dashboard
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="ml-3 h-6 w-6">
                  <path d="M5 12h14"/>
                  <path d="m12 5 7 7-7 7"/>
                </svg>
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </section>

    </div>
  );
}
