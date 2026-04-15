import { useEffect, useRef, useState } from 'react';

const AnimatedSection = ({
  children,
  className = '',
  delay = 0,
  as = 'div',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);
  const Tag = as;

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.15,
      }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
        transition: `opacity 320ms ease-out ${delay}ms, transform 320ms ease-out ${delay}ms`,
      }}
    >
      {children}
    </Tag>
  );
};

export default AnimatedSection;
